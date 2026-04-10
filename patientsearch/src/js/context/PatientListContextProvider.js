import React, { useContext, useRef, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import jsonpath from "jsonpath";
import PropTypes from "prop-types";
import CircularProgress from "@mui/material/CircularProgress";
import { useSettingContext } from "./SettingContextProvider";
import { useUserContext } from "./UserContextProvider";
import * as constants from "../constants/consts";
import {
  capitalizeFirstLetter,
  fetchData,
  getActiveEntriesFromPatientBundle,
  getAppLaunchURL,
  getFirstResourceFromFhirBundle,
  getErrorDiagnosticTextFromResponse,
  getInactiveEntriesFromPatientBundle,
  getLocalDateTimeString,
  getClientsByRequiredRoles,
  getSortedEntriesFromBundle,
  getTimeAgoDisplay,
  isInPast,
  isString,
  getUrlParameter,
  isEmptyArray,
  toTop,
} from "../helpers/utility";
import RowData from "../models/RowData";
import { usePatientListStore } from "../stores/patientListStore";

const AppContext = React.createContext({});

const {
  closeLoadingModal,
  setLoading,
  setError,
  setLaunchURL,
  setOpenReactivatingModal,
  setOpenLaunchInfoModal: openLaunchInfoModalAction,
  resetSearch,
  resetPagination,
} = usePatientListStore.getState();

export default function PatientListContextProvider({ children }) {
  const { appSettings = {}, getAppSettingByKey = () => null } =
    useSettingContext();

  const { user } = useUserContext();
  const { roles } = user || {};
  const appClients = appSettings
    ? getClientsByRequiredRoles(appSettings["SOF_CLIENTS"], roles)
    : null;

  const tableRef = useRef();

  const SEARCH_FIELDS = useMemo(
    () => constants.getSearchFields(getAppSettingByKey("SEARCH_FIELDS")),
    [getAppSettingByKey],
  );

  const columns = useMemo(() => {
    const settingColumns = getAppSettingByKey("DASHBOARD_COLUMNS");
    const isValidConfig = !isEmptyArray(settingColumns);
    const configColumns = isValidConfig
      ? settingColumns
      : constants.defaultColumns;
    const sortByQS = getUrlParameter("sort_by") ?? "";
    const sortDirQS = getUrlParameter("sort_direction") ?? "";
    let cols = [...configColumns];
    if (!cols.find((c) => c.field === "id"))
      cols.push({ label: "id", hidden: true, expr: "$.id" });
    return cols.map((col, index) => {
      const fieldName = col.label.toLowerCase().replace(/\s/g, "_");
      const isDefaultSort =
        fieldName === sortByQS.replace(/\s/g, "_") ||
        col.field?.defaultSort != null;
      return {
        ...col,
        title: col.label,
        field: fieldName,
        defaultValue: col.field === "id" ? index : col.defaultValue,
        defaultSort: isDefaultSort
          ? sortDirQS || col.defaultSort || "asc"
          : col.defaultSort || null,
        // eslint-disable-next-line
        emptyValue: () => <div datacolumn={col.label}>-</div>,
        render: (rowData) => (
          // eslint-disable-next-line
          <div datacolumn={col.label} dataid={rowData["id"]}>
            {rowData[fieldName]}
          </div>
        ),
      };
    });
  }, [getAppSettingByKey]);

  const defaultFilters = useMemo(() => {
    if (isEmptyArray(SEARCH_FIELDS)) return {};
    const d = {};
    SEARCH_FIELDS.forEach((o) => (d[o.dataKey] = ""));
    return RowData.create(d).getFilters();
  }, [SEARCH_FIELDS]);

  const needExternalAPILookup = useCallback(
    () => !!getAppSettingByKey("EXTERNAL_FHIR_API"),
    [getAppSettingByKey],
  );
  const getLaunchableSofClients = useCallback(
    () =>
      isEmptyArray(appClients)
        ? null
        : appClients.filter(
            (c) => String(c.standalone).toLowerCase() !== "true",
          ),
    [appClients],
  );
  const hasSoFClients = useCallback(() => {
    const apps = getLaunchableSofClients();
    return !isEmptyArray(apps) && apps.length > 0;
  }, [getLaunchableSofClients]);
  const hasMultipleLaunchableSoFClients = useCallback(
    () => hasSoFClients() && getLaunchableSofClients()?.length > 1,
    [hasSoFClients, getLaunchableSofClients],
  );
  const getLaunchURL = useCallback(
    (patientId, launchParams) => {
      if (!patientId) return "";
      return getAppLaunchURL(patientId, {
        ...(launchParams || {}),
        ...appSettings,
      });
    },
    [appSettings],
  );
  const canLaunchApp = useCallback(
    () =>
      hasSoFClients() &&
      (getLaunchableSofClients()?.length === 1 ||
        getAppSettingByKey("LAUNCH_AFTER_PATIENT_CREATION")),
    [hasSoFClients, getLaunchableSofClients, getAppSettingByKey],
  );
  const handleLaunchError = useCallback((message) => {
    setError(message || "Unable to launch application.");
    closeLoadingModal();
    toTop();
    return false;
  }, []);
  const handleLaunchApp = useCallback(
    (rowData, launchParams) => {
      if (!launchParams)
        launchParams = canLaunchApp() ? getLaunchableSofClients()[0] : null;
      if (!launchParams && hasMultipleLaunchableSoFClients()) {
        closeLoadingModal();
        openLaunchInfoModalAction(rowData);
        return;
      }
      const url = getLaunchURL(rowData?.id, launchParams);
      if (!url) {
        handleLaunchError(
          "Unable to launch application. Missing launch URL. Missing configurations.",
        );
        return false;
      }
      setLaunchURL(url);
      sessionStorage.clear();
    },
    [
      canLaunchApp,
      getLaunchableSofClients,
      hasMultipleLaunchableSoFClients,
      handleLaunchError,
      getLaunchURL,
    ],
  );

  const handleErrorCallback = useCallback((e) => {
    const oStatus = constants.objErrorStatus[parseInt(e?.status)];
    if (oStatus) {
      setError("Logging out due to error.");
      window.location = oStatus.logoutURL;
      return;
    }
    setError(
      isString(e) ? e : (e?.message ?? "Error occurred processing data"),
    );
  }, []);

  const handleRefresh = useCallback(() => {
    resetSearch({ currentFilters: defaultFilters });
    resetPagination();
    tableRef.current?.onQueryChange();
  }, [defaultFilters, tableRef]);

  const getPatientSearchURL = useCallback((rowData, params) => {
    const oData = new RowData(rowData);
    const { searchInactive, useActiveFlag, isUpdate, isExternalLookup } =
      params || {};
    if (isUpdate && rowData?.id) return `/fhir/Patient/${rowData.id}`;
    const isValidValue = (v, f) => {
      if (!v) return false;
      if (f.isDate || f.type === "date") return dayjs(v).isValid();
      return String(v).trim() !== "";
    };
    const buildSearchParams = (isExternal = false) => {
      const sp = [];
      SEARCH_FIELDS.forEach((field) => {
        const dataKey = field.dataKey || field.name;
        const value = oData.getField(dataKey) || oData.data[dataKey];
        if (!isValidValue(value, field)) return;
        const tv = String(value).trim();
        if (isExternal) {
          const fk = field.externalKey || field.fhirKey;
          if (!fk) console.warn("Missing FHIR field key", tv);
          else sp.push(`${fk}=${field.externalPrefix || ""}${tv}`);
        } else {
          if (!field.fhirKey) console.warn("Missing FHIR field key", tv);
          else if (field.exactMatch) {
            sp.push(
              `${field.fhirKey}:exact=${[tv, tv.toLowerCase(), tv.toUpperCase(), capitalizeFirstLetter(tv)].join(",")}`,
            );
          } else sp.push(`${field.fhirKey}=${tv}`);
        }
      });
      return sp;
    };
    if (isExternalLookup) {
      return `/external_search/Patient?${buildSearchParams(true).join("&")}`;
    }
    let url = `/fhir/Patient?${buildSearchParams().join("&")}`;
    if (searchInactive) url += `&inactive_search=true`;
    else if (useActiveFlag) url += `&active=true`;
    return url;
  }, [SEARCH_FIELDS]);

  const formatRowData = useCallback(
    (rawData) => {
      if (!rawData) return [];
      return (Array.isArray(rawData) ? rawData : [rawData]).map(
        (item, index) => {
          const source = item.resource || item;
          const rowData = {
            id: jsonpath.value(source, "$.id") ?? index,
            resource: source,
            identifier: jsonpath.value(source, "$.identifier") || [],
          };
          columns.forEach((col) => {
            if (!col.field) return;
            const dt = String(col.dataType).toLowerCase();
            let v = col.expr
              ? jsonpath.nodes(source, col.expr)[0]?.value || null
              : null;
            if (dt === "date") v = v ? getLocalDateTimeString(v) : "-";
            if (dt === "timeago" && v) v = getTimeAgoDisplay(new Date(v));
            if (col.field === "next_message")
              v = isInPast(v) ? "-" : getLocalDateTimeString(v);
            rowData[col.field] = v ?? col.defaultValue ?? "-";
          });
          return rowData;
        },
      );
    },
    [columns],
  );

  const getFetchErrorMessage = useCallback((e, noData, isExternalLookup) => {
    const noResultMsg = isExternalLookup
      ? constants.NON_PDMP_RESULT_MESSAGE
      : "Server error occurred. No result returned.  See console for detail.";
    const fetchErrorMsg = noData
      ? noResultMsg
      : isExternalLookup
        ? constants.PDMP_SYSTEM_ERROR_MESSAGE
        : "Server error occurred.  See console for detail.";
    const errorText = isString(e) ? e : (e?.message ?? "");
    return (
      fetchErrorMsg +
      (errorText
        ? `<p>Response from the system: ${errorText}</p>`
        : `<p>See console for detail.</p>`)
    );
  }, []);
  const getFHIRPatientData = useCallback(
    async (rowData, isExternalLookup) =>
      fetchData(
        getPatientSearchURL(
          rowData,
          {
            searchInactive: !!appSettings["REACTIVATE_PATIENT"],
            isExternalLookup: isExternalLookup,
          }
        ),
        {
          ...constants.searchHeaderParams,
          method: isExternalLookup ? "PUT" : "GET",
        },
        (e, status) => {
          const bad =
            status && parseInt(status) > 300 && parseInt(status) < 500;
          handleErrorCallback(getFetchErrorMessage(e, !bad, isExternalLookup));
        },
      ),
    [
      getPatientSearchURL,
      appSettings,
      getFetchErrorMessage,
      handleErrorCallback,
    ],
  );

  const handleSearch = useCallback(
    async (rowData, params) => {
      if (!rowData || isEmptyArray(Object.keys(rowData))) {
        handleLaunchError("No data provided for searching.");
        return false;
      }
      const isReactivate = params?.reactivate,
        isCreateNew = params?.createNew,
        isExternalLookup = needExternalAPILookup();
      setLoading(rowData);
      let rowDataToUse = Object.assign({}, rowData);
      try {
        const bundleResult = await getFHIRPatientData(
          rowData,
          isExternalLookup,
        );
        if (isEmptyArray(bundleResult?.entry)) {
          if (isExternalLookup) {
            handleRefresh();
            setError(
              getFetchErrorMessage(
                "Search returns no match",
                true,
                isExternalLookup,
              ),
            );
          }
        } else {
          const entries = getSortedEntriesFromBundle(bundleResult.entry);
          const activeEntries = getActiveEntriesFromPatientBundle(entries);
          const inactiveEntries = getInactiveEntriesFromPatientBundle(entries);
          const shouldReactivate =
            !isEmptyArray(inactiveEntries) &&
            getAppSettingByKey("REACTIVATE_PATIENT");
          if (activeEntries.length > 1) {
            setError("Multiple matched entries found.");
            return;
          }
          if (activeEntries.length === 1) {
            const target = formatRowData(activeEntries[0])[0];
            if (!isCreateNew && canLaunchApp()) {
              handleLaunchApp(target);
              return;
            }
            if (isExternalLookup) {
              handleRefresh();
              return;
            }
          } else {
            if (!isCreateNew && !isReactivate) {
              if (inactiveEntries.length > 1) {
                setError("Multiple matched entries found.");
                return;
              }
              const inactiveEntryToUse = formatRowData(inactiveEntries[0])[0];
              if (shouldReactivate) {
                setOpenReactivatingModal(inactiveEntryToUse);
                closeLoadingModal();
                return;
              }
              if (inactiveEntries.length === 1) {
                handleLaunchApp(inactiveEntryToUse);
                return;
              }
            }
          }
          const entryToUse = entries.length
            ? entries[0]
            : getFirstResourceFromFhirBundle(bundleResult);
          rowDataToUse.resource = entryToUse;
          rowDataToUse.id = entryToUse.id;
        }
        const oData = new RowData(rowDataToUse);
        const payload = JSON.stringify(oData.getFhirData(isCreateNew));
        const isUpdate = isReactivate || (!isCreateNew && !!rowDataToUse?.id);
        const result = await fetchData(
          getPatientSearchURL(
            rowDataToUse,
            {
              useActiveFlag: !!getAppSettingByKey("ACTIVE_PATIENT_FLAG"),
              isUpdate,
              isExternalLookup: isExternalLookup,
            }
          ),
          {
            ...constants.searchHeaderParams,
            body: payload,
            method: isUpdate ? "PUT" : "POST",
          },
          (e) => setError(getFetchErrorMessage(e, false, isExternalLookup)),
        );
        const response = getFirstResourceFromFhirBundle(result);
        if (!response || !response.id) {
          const et = getErrorDiagnosticTextFromResponse(response);
          setError(getFetchErrorMessage(et, !et));
          return false;
        }
        handleRefresh();
        if (canLaunchApp()) handleLaunchApp(formatRowData(response)[0]);
      } catch (e) {
        setError(getFetchErrorMessage(e, false, needExternalAPILookup()));
      }
    },
    [
      needExternalAPILookup,
      getFHIRPatientData,
      handleRefresh,
      getFetchErrorMessage,
      formatRowData,
      getPatientSearchURL,
      canLaunchApp,
      handleLaunchApp,
      handleLaunchError,
      getAppSettingByKey,
    ],
  );

  const appContextValue = useMemo(
    () => ({
      appClients,
      tableRef,
      searchFields: SEARCH_FIELDS,
      columns,
      handleErrorCallback,
      handleLaunchApp,
      handleSearch,
      formatRowData,
      needExternalAPILookup,
    }),
    [
      appClients,
      tableRef,
      formatRowData,
      handleErrorCallback,
      handleLaunchApp,
      handleSearch,
      needExternalAPILookup,
      columns,
      SEARCH_FIELDS,
    ],
  );
  return (
    <AppContext.Provider value={appContextValue}>
      <AppContext.Consumer>
        {() => {
          if (isEmptyArray(Object.keys(appSettings)))
            return (
              <div
                style={{ display: "flex", gap: "16px 16px", padding: "24px" }}
              >
                Loading... <CircularProgress color="primary"></CircularProgress>
              </div>
            );
          return children;
        }}
      </AppContext.Consumer>
    </AppContext.Provider>
  );
}

PatientListContextProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.element]),
};

function useCtx(Context, name) {
  const ctx = useContext(Context);
  if (ctx === undefined)
    throw new Error(`${name} must be used within PatientListContextProvider`);
  return ctx;
}

export function useAppContext() {
  return useCtx(AppContext, "useAppContext");
}
