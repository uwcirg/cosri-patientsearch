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
  getUrlParameter,
  isInPast,
  isString,
  isEmptyArray,
  toTop,
} from "../helpers/utility";
import RowData from "../models/RowData";
import { usePatientListStore } from "../stores/patientListStore";

const AppContext = React.createContext({});

const {
  closeLoadingModal,
  setCurrentRow,
  setLoading,
  setError,
  setLaunchURL,
  setOpenReactivatingModal,
  setOpenLaunchInfoModal,
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
        setCurrentRow(rowData);
        setOpenLaunchInfoModal();
        return;
      }
      const url = getLaunchURL(rowData?.id, launchParams);
      if (!url) {
        handleLaunchError(
          "Unable to launch application. Missing launch URL. Missing configurations.",
        );
        return false;
      }
      setLoading();
      setLaunchURL(url);
      setTimeout(() => closeLoadingModal(), 1000);
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

  const resetTable = useCallback(() => {
    tableRef.current?.onQueryChange();
  }, [tableRef]);

  const handleRefresh = useCallback(() => {
    resetSearch({ currentFilters: defaultFilters });
    resetPagination();
    resetTable();
    setCurrentRow(null);
  }, [defaultFilters, resetTable]);

  const getPatientSearchURL = useCallback(
    (rowData, params) => {
      const oData = new RowData(rowData);
      const {
        searchInactive,
        useActiveFlag,
        isUpdate,
        isExternalLookup,
        searchFields,
      } = params || {};
      if (isUpdate && rowData?.id) return `/fhir/Patient/${rowData.id}`;
      const isValidValue = (v, f) => {
        if (!v) return false;
        if (f.isDate || f.type === "date") return dayjs(v).isValid();
        return String(v).trim() !== "";
      };
      const buildSearchParams = (isExternal = false) => {
        const sp = [];
        (searchFields || SEARCH_FIELDS).forEach((field) => {
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
    },
    [SEARCH_FIELDS],
  );

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
        getPatientSearchURL(rowData, {
          searchInactive: !!appSettings["REACTIVATE_PATIENT"],
          isExternalLookup: isExternalLookup,
        }),
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

  const querySearch = useCallback(
    async (rowData, params) => {
      let returnValue = { error: null, data: null, reactivate: false };
      if (!rowData || isEmptyArray(Object.keys(rowData))) {
        return {
          ...returnValue,
          error: "No data provided for searching.",
        };
      }
      const isReactivate = params?.reactivate,
        isCreateNew = params?.createNew,
        isExternalLookup = params?.isExternalLookup;
      let rowDataToUse = Object.assign({}, rowData);
      try {
        const bundleResult = await getFHIRPatientData(
          rowData,
          isExternalLookup,
        );
        if (isEmptyArray(bundleResult?.entry)) {
          if (isExternalLookup) {
            returnValue.error = getFetchErrorMessage(
              "Search returns no match",
              true,
              isExternalLookup,
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
            return {
              ...returnValue,
              error: "Multiple matched entries found.",
            };
          }
          if (activeEntries.length === 1) {
            const target = formatRowData(activeEntries[0])[0];
            if (!isCreateNew) {
              return {
                ...returnValue,
                data: target,
              };
            }
          } else {
            if (!isCreateNew && !isReactivate) {
              if (inactiveEntries.length > 1) {
                return {
                  ...returnValue,
                  error: "Multiple matched entries found.",
                };
              }
              const inactiveEntryToUse = formatRowData(inactiveEntries[0])[0];
              if (shouldReactivate) {
                return {
                  ...returnValue,
                  data: inactiveEntryToUse,
                  reactivate: true,
                };
              }
              if (inactiveEntries.length === 1) {
                return {
                  ...returnValue,
                  data: inactiveEntryToUse,
                };
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
          getPatientSearchURL(rowDataToUse, {
            useActiveFlag: !!getAppSettingByKey("ACTIVE_PATIENT_FLAG"),
            isUpdate,
            isExternalLookup: isExternalLookup,
          }),
          {
            ...constants.searchHeaderParams,
            body: payload,
            method: isUpdate ? "PUT" : "POST",
          },
          (e) => {
            returnValue.error = getFetchErrorMessage(
              e,
              false,
              isExternalLookup,
            );
          },
        );
        const response = getFirstResourceFromFhirBundle(result);
        if (!response || !response.id) {
          const et = getErrorDiagnosticTextFromResponse(response);
          return {
            ...returnValue,
            error: getFetchErrorMessage(et, !et),
          };
        }
        return {
          ...returnValue,
          data: formatRowData(response)[0],
        };
      } catch (e) {
        return {
          ...returnValue,
          error: getFetchErrorMessage(e, false, isExternalLookup),
        };
      }
    },
    [
      getFHIRPatientData,
      getFetchErrorMessage,
      formatRowData,
      getPatientSearchURL,
      getAppSettingByKey,
    ],
  );

  const handleSearch = useCallback(
    async (rowData, params) => {
      const paramsToUse = {
        ...(params ?? {}),
        isExternalLookup: needExternalAPILookup(),
      };
      setLoading();
      setCurrentRow(rowData);
      setError("");
      const result = await querySearch(rowData, paramsToUse);
      const { error, data, reactivate } = result;
      if (error) {
        handleRefresh();
        closeLoadingModal();
        handleErrorCallback(error);
      } else if (data) {
        if (reactivate) {
          setCurrentRow(rowData);
          setOpenReactivatingModal();
          closeLoadingModal();
        } else {
          if (canLaunchApp()) handleLaunchApp(data);
          handleRefresh();
          setTimeout(() => closeLoadingModal(), 1000);
        }
      }
    },
    [
      needExternalAPILookup,
      canLaunchApp,
      handleLaunchApp,
      querySearch,
      handleRefresh,
      handleErrorCallback,
    ],
  );

  const getSortDirectives = useCallback(
    (orderByCollection) => {
      let sortField = null,
        sortDirection = null;
      if (!isEmptyArray(orderByCollection)) {
        const of_ = orderByCollection[0];
        if (of_) {
          sortField = of_.orderByField;
          sortDirection = of_.orderDirection;
        }
      }
      if (!sortField) {
        const dc = isEmptyArray(columns)
          ? null
          : columns.find((c) => c.defaultSort) || null;
        sortField = dc ? dc.field : "_lastUpdated";
        sortDirection = dc?.defaultSort ?? "desc";
      }
      if (sortField) {
        // convert field to FHIR field name
        sortField = constants.DATA_TO_FHIR_FIELD_MAPPINGS[sortField] ?? null;
      }
      return { sortField, sortDirection };
    },
    [columns],
  );

  const getSearchQueryString = useCallback((fields) => {
    if (isEmptyArray(fields)) return "";
    const fb = [];
    fields.forEach((item) => {
      const fhirField =
        constants.DATA_TO_FHIR_FIELD_MAPPINGS[item.field] ?? item.field;
      if (item.value) fb.push(`${fhirField}:contains=${item.value}`);
    });
    return fb.join("&");
  }, []);

  const getPatientListQueryURL = useCallback(
    (query, params = {}) => {
      const { sortField, sortDirection } = getSortDirectives(
        query.orderByCollection,
      );
      const sortMinus = sortField && sortDirection !== "asc" ? "-" : "";
      const searchString = getSearchQueryString(params?.searchFields);
      const filterByTestPatients = params?.filterByTestPatients;
      const {
        pageSize = 20,
        pageNumber = 0,
        prevPageNumber = 0,
        nextPageURL = "",
        prevPageURL = "",
      } = params?.pagination ?? {};

      let apiURL = `/fhir/Patient?_include=Patient:link&_total=accurate&_count=${pageSize}`;
      if (!isEmptyArray(params?.patientIdsByCareTeamParticipant))
        apiURL += `&_id=${params?.patientIdsByCareTeamParticipant.join(",")}`;
      if (
        getAppSettingByKey("ENABLE_FILTER_FOR_TEST_PATIENTS") &&
        !filterByTestPatients
      )
        apiURL += `&_security:not=HTEST`;
      if (pageNumber > prevPageNumber && nextPageURL) apiURL = nextPageURL;
      else if (pageNumber < prevPageNumber && prevPageURL) apiURL = prevPageURL;
      if (searchString && apiURL.indexOf("contains") === -1)
        apiURL += `&${searchString}`;
      if (sortField && apiURL.indexOf("sort") === -1)
        apiURL += `&_sort=${sortMinus}${sortField}`;
      return apiURL;
    },
    [getSortDirectives, getSearchQueryString, getAppSettingByKey],
  );

  const getLinksFromResponse = useCallback((response) => {
    if (!response) return {};
    const find = (rel) =>
      !isEmptyArray(response.link)
        ? response.link.filter((i) => i.relation === rel)
        : null;
    const self_ = find("self"),
      next_ = find("next"),
      prev_ = find("previous");
    const hasSelf = !isEmptyArray(self_);
    return {
      nextURL: !isEmptyArray(next_) ? next_[0].url : "",
      previousURL: !isEmptyArray(prev_) ? prev_[0].url : "",
      selfURL: hasSelf ? self_[0].url : "",
    };
  }, []);

  const queryPatientList = useCallback(
    (query, params) => {
      const defaults = {
        data: [],
        page: 0,
        error: null,
        entry: null,
        nextPageURL: "",
        prevPageURL: "",
        disableNextButton: false,
        disablePrevButton: false,
        totalCount: 0,
      };
      return new Promise((resolve) => {
        fetchData(
          getPatientListQueryURL(query, params),
          constants.noCacheParam,
          (e) => {
            resolve({
              ...defaults,
              error: e,
            });
          },
        )
          .then((response) => {
            if (!response || isEmptyArray(response.entry)) {
              resolve(defaults);
              return;
            }
            const { nextURL, previousURL, selfURL } =
              getLinksFromResponse(response);
            let currentPage = 0;
            if (selfURL) {
              const off = getUrlParameter("_getpagesoffset", new URL(selfURL));
              if (off) currentPage = off / query.pageSize;
            }
            const patientResources = response.entry.filter(
              (i) => i.resource?.resourceType === "Patient",
            );
            const responseData = formatRowData(patientResources);
            const resolvedData = {
              entry: response.entry,
              data: responseData,
              page: currentPage,
              nextPageURL: nextURL,
              prevPageURL: previousURL,
              disableNextButton: !nextURL,
              disablePrevButton: !previousURL,
              totalCount: response.total,
            };
            const additionalParams = getAppSettingByKey(
              "FHIR_REST_EXTRA_PARAMS_LIST",
            );
            const eligible = additionalParams
              ? additionalParams.filter(
                  (r) =>
                    typeof r === "string" ||
                    (typeof r === "object" && r.resourceType),
                )
              : [];
            if (isEmptyArray(eligible)) {
              resolve(resolvedData);
              return;
            }
            const ids = patientResources.map((i) => i.resource.id).join(",");
            const requests = eligible.map((request) => {
              const {
                resourceType,
                queryParams,
                referenceElement = "patient",
              } = typeof request === "object" ? request : {};
              const params = ["_count=1000", `${referenceElement}=${ids}`];
              const qs =
                typeof request === "string"
                  ? request +
                    (request.includes("?") ? "" : "?") +
                    params.join("&")
                  : `${resourceType}?${[...params, queryParams].join("&")}`;
              return fetchData(`/fhir/${qs}`, constants.noCacheParam);
            });
            Promise.all(requests)
              .then((results) => {
                if (isEmptyArray(results)) {
                  resolve(resolvedData);
                  return;
                }
                const enriched = patientResources.map((item) => {
                  const sid = item.resource.id;
                  if (!item.resource["resources"])
                    item.resource["resources"] = [];
                  results.forEach((res) => {
                    if (isEmptyArray(res.entry)) return;
                    item.resource["resources"] = [
                      ...item.resource["resources"],
                      ...res.entry
                        .filter((o) => {
                          const mr = additionalParams.filter(
                            (ap) =>
                              ap.resourceType &&
                              ap.resourceType === o.resource.resourceType,
                          );
                          const ref =
                            mr.length > 0 ? mr[0].referenceElement : "subject";
                          return (
                            o.resource?.[ref]?.reference?.split("/")[1] === sid
                          );
                        })
                        .map((ri) => ri.resource),
                    ];
                  });
                  return item;
                });
                const resultData = formatRowData(enriched);
                resolve({
                  ...resolvedData,
                  data: resultData,
                  page: currentPage,
                  totalCount: response.total,
                });
              })
              .catch((e) => {
                console.log(e);
                resolve({
                  ...resolvedData,
                  error:
                    "Error retrieving additional FHIR resources.  See console for detail.",
                });
              });
          })
          .catch((error) => {
            resolve({ ...defaults, error: error });
          });
      });
    },
    [
      getPatientListQueryURL,
      getLinksFromResponse,
      formatRowData,
      getAppSettingByKey,
    ],
  );

  const appContextValue = useMemo(
    () => ({
      appClients,
      tableRef,
      searchFields: SEARCH_FIELDS,
      columns,
      queryPatientList,
      handleErrorCallback,
      handleLaunchApp,
      handleSearch,
      needExternalAPILookup,
    }),
    [
      appClients,
      tableRef,
      queryPatientList,
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
