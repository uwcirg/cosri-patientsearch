import React, {
  useContext,
  useEffect,
  useRef,
  useMemo,
  useReducer,
  useCallback,
} from "react";
import dayjs from "dayjs";
import jsonpath from "jsonpath";
import DOMPurify from "dompurify";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useSettingContext } from "./SettingContextProvider";
import { useUserContext } from "./UserContextProvider";
import * as constants from "../constants/consts";
import DetailPanel from "../components/patientList/DetailPanel";
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
  hasFlagForCheckbox,
  isInPast,
  isString,
  putPatientData,
  getUrlParameter,
  isEmptyArray,
  toTop,
} from "../helpers/utility";
import RowData from "../models/RowData";

const PatientListContext = React.createContext({});

/*
 * context provider component that allows patient list settings to be accessible to its children component(s)
 */

const ACTIONS = {
  SET_ACTION_LABEL: "SET_ACTION_LABEL",
  SET_CARE_TEAM_PATIENT_IDS: "SET_CARE_TEAM_PATIENT_IDS",
  SET_CONTAIN_NO_PMP_FLAG: "SET_CONTAIN_NO_PMP_FLAG",
  SET_CURRENT_ROW: "SET_CURRENT_ROW",
  SET_DATA: "SET_DATA",
  SET_ERROR: "SET_ERROR",
  SET_LOADING: "SET_LOADING",
  SET_LAUNCH_URL: "SET_LAUNCH_URL",
  SET_SELECTED_MENU_ITEM: "SET_SELECTED_MENU_ITEM",
  OPEN_LAUNCH_INFO_MODAL: "OPEN_LAUNCH_INFO_MODAL",
  CLOSE_LAUNCH_INFO_MODAL: "CLOSE_LAUNCH_INFO_MODAL",
  UPDATE_FILTERS: "UPDATE_FILTERS",
  OPEN_MENU: "OPEN_MENU",
  OPEN_REACTIVATING_MODAL: "OPEN_REACTIVATING_MODAL",
  CLOSE_REACTIVATING_MODAL: "CLOSE_REACTIVATING_MODAL",
  CLOSE_MENU: "CLOSE_MENU",
  OPEN_LAUNCH_MODAL: "OPEN_LAUNCH_MODAL",
  RESET_STATE: "RESET_STATE",
  RESET_SEARCH: "RESET_SEARCH",
  RESET_LAUNCH_URL: "RESET_LAUNCH_URL",
  TOGGLE_TEST_PATIENTS: "TOGGLE_TEST_PATIENTS",
};

const contextReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        openLoadingModal: true,
        errorMessage: "",
        currentRow: action.payload || state.currentRow,
      };
    case ACTIONS.SET_DATA:
      return { ...state, data: action.payload, openLoadingModal: false };

    case ACTIONS.UPDATE_FILTERS:
      return { ...state, errorMessage: "", ...action.payload };
    case ACTIONS.SET_CURRENT_ROW:
      return { ...state, currentRow: action.payload };
    case ACTIONS.SET_LAUNCH_URL:
      return {
        ...state,
        launchURL: action.payload,
        currentRow: null,
        openLoadingModal: true,
      };
    case ACTIONS.SET_SELECTED_MENU_ITEM:
      return { ...state, selectedMenuItem: action.payload };
    case ACTIONS.OPEN_LAUNCH_INFO_MODAL:
      return {
        ...state,
        openLaunchInfoModal: true,
        currentRow: action.payload,
      };
    case ACTIONS.CLOSE_LAUNCH_INFO_MODAL:
      return {
        ...state,
        openLaunchInfoModal: false,
        currentRow: null,
      };
    case ACTIONS.OPEN_REACTIVATING_MODAL:
      return {
        ...state,
        openReactivatingModal: true,
        currentRow: action.payload,
      };
    case ACTIONS.CLOSE_REACTIVATING_MODAL:
      return {
        ...state,
        openReactivatingModal: false,
        currentRow: null,
      };
    case ACTIONS.OPEN_LAUNCH_MODAL:
      return { ...state, openLaunchModal: true, currentRow: action.payload };
    case ACTIONS.SET_CARE_TEAM_PATIENT_IDS:
      return { ...state, patientIdsByCareTeamParticipant: action.payload };
    case ACTIONS.SET_CONTAIN_NO_PMP_FLAG:
      return { ...state, containNoPMPRow: action.payload };
    case ACTIONS.SET_ACTION_LABEL:
      return { ...state, actionLabel: action.payload };
    case ACTIONS.RESET_LAUNCH_URL:
      return {
        ...state,
        launchURL: "",
        openLoadingModal: false,
        currentRow: null,
      };
    case ACTIONS.RESET_STATE:
      return {
        ...state,
        currentRow: null,
        errorMessage: "",
        ...action.payload,
      };
    case ACTIONS.OPEN_MENU:
      return { ...state, currentRow: action.payload, openMenu: true };
    case ACTIONS.CLOSE_MENU:
      return {
        ...state,
        openMenu: false,
        currentRow: null,
        selectedMenuItem: "",
      };
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        errorMessage: isString(action.payload)
          ? action.payload
          : (action.payload?.errorMessage ?? "An error occurred."),
        openLoadingModal: false,
      };
    case ACTIONS.TOGGLE_TEST_PATIENTS:
      return { ...state, filterByTestPatients: action.payload };
    case ACTIONS.RESET_SEARCH:
      return {
        ...state,
        currentRow: null,
        errorMessage: "",
        currentFilters: {},
        ...action.payload,
      };
    default:
      return {
        ...state,
        ...(action.payload ?? {}),
      };
  }
};

const paginationReducer = (state, action) => {
  if (action.type === "empty") {
    return {
      ...state,
      pageNumber: 0,
      prevPageNumber: 0,
      disablePrevButton: true,
      disableNextButton: true,
      totalCount: 0,
      nextPageURL: "",
      prevPageURL: "",
    };
  }
  if (action.type === "reset") {
    return {
      ...state,
      pageNumber: 0,
      nextPageURL: "",
      prevPageURL: "",
    };
  }
  return {
    ...state,
    ...action.payload,
  };
};

export default function PatientListContextProvider({ children }) {
  const settingsCxt = useSettingContext();
  const theme = useTheme();
  const {
    appSettings = {},
    hasAppSettings = () => false,
    getAppSettingByKey = () => null,
  } = settingsCxt ? settingsCxt : {};
  const { user, userError } = useUserContext();
  const { userName, roles } = user || {};
  const appClients = appSettings
    ? getClientsByRequiredRoles(appSettings["SOF_CLIENTS"], roles)
    : null;
  const tableRef = useRef();
  const filterRowRef = useRef();
  const filterTimeoutRef = useRef(null);

  const SEARCH_FIELDS = useMemo(
    () => constants.getSearchFields(getAppSettingByKey("SEARCH_FIELDS")),
    [getAppSettingByKey],
  );

  const columns = useMemo(() => {
    const settingColumns = getAppSettingByKey("DASHBOARD_COLUMNS");
    const isValidConfig = !isEmptyArray(settingColumns);
    if (!isValidConfig) {
      console.log("invalid columns via config. Null or not an array.");
    }
    const configColumns = isValidConfig
      ? settingColumns
      : constants.defaultColumns;
    const sortByQueryString = getUrlParameter("sort_by") ?? "";
    const sortDirectionQueryString = getUrlParameter("sort_direction") ?? "";
    let cols = [...configColumns];
    if (!cols.find((c) => c.field === "id")) {
      cols.push({ label: "id", hidden: true, expr: "$.id" });
    }
    return cols.map((col, index) => {
      const fieldName = col.label.toLowerCase().replace(/\s/g, "_");
      const isDefaultSortColumn =
        fieldName === sortByQueryString.replace(/\s/g, "_") ||
        col.field?.defaultSort != null;
      return {
        ...col,
        title: col.label,
        field: fieldName,
        defaultValue: col.field === "id" ? index : col.defaultValue,
        defaultSort: isDefaultSortColumn
          ? sortDirectionQueryString
            ? sortDirectionQueryString
            : col.defaultSort
              ? col.defaultSort
              : "asc"
          : col.defaultSort
            ? col.defaultSort
            : null,
        /* eslint-disable react/no-unknown-property */
        emptyValue: () => <div datacolumn={`${col.label}`}>-</div>,

        render: (rowData) => {
          /* eslint-disable react/no-unknown-property */
          return <div datacolumn={col.label}>{rowData[fieldName]}</div>;
        },
      };
    });
  }, [getAppSettingByKey]);

  const defaultFilters = useMemo(() => {
    if (isEmptyArray(SEARCH_FIELDS)) return {};
    let defaults = {};
    SEARCH_FIELDS.forEach((o) => (defaults[o.dataKey] = ""));
    return RowData.create(defaults).getFilters();
  }, [SEARCH_FIELDS]);

  const [pagination, paginationDispatch] = useReducer(
    paginationReducer,
    constants.defaultPagination,
  );
  const [contextState, dispatch] = useReducer(contextReducer, {
    data: [],
    patientIdsByCareTeamParticipant: hasFlagForCheckbox(
      constants.FOLLOWING_FLAG,
    )
      ? user && user.followingPatientIds
        ? user.followingPatientIds
        : null
      : null,
    launchURL: "",
    openLoadingModal: false,
    openMenu: false,
    openReactivatingModal: false,
    openLaunchInfoModal: false,
    containNoPMPRow: false,
    selectedMenuItem: "",
    currentRow: null,
    currentFilters: {},
    filterByTestPatients: false,
    errorMessage: "",
    actionLabel: constants.LAUNCH_BUTTON_LABEL,
    noDataText: "No record found.",
  });

  const selectedMenuItemRef = useRef(contextState.selectedMenuItem);
  const currentRowRef = useRef(contextState.currentRow);

  const getSearchableFields = useCallback(() => {
    if (isEmptyArray(columns)) return [];
    return columns.filter((column) => column.searchable);
  }, [columns]);

  const needExternalAPILookup = useCallback(() => {
    return getAppSettingByKey("EXTERNAL_FHIR_API");
  }, [getAppSettingByKey]);

  const getLaunchableSofClients = useCallback(() => {
    if (isEmptyArray(appClients)) return null;
    return appClients.filter((c) => String(c.standalone).toLowerCase() !== "true");
  }, [appClients])

  const hasSoFClients = useCallback(() => {
    const apps = getLaunchableSofClients();
    if (isEmptyArray(apps)) return false;
    return apps.length > 0;
  }, [appClients, getLaunchableSofClients]);

  const hasMultipleLaunchableSoFClients = useCallback(() => {
    return (
      hasSoFClients() &&
      appClients.filter((c) => String(c.standalone).toLowerCase() !== "true")
        .length > 1
    );
  }, [hasSoFClients, appClients]);

  const _getLaunchURL = useCallback(
    (patientId, launchParams) => {
      if (!patientId) {
        console.log("Missing information: patient Id");
        return "";
      }
      launchParams = launchParams || {};
      return getAppLaunchURL(patientId, { ...launchParams, ...appSettings });
    },
    [appSettings],
  );

  // if only one SoF client, use its launch params
  // or param specified launching first client app
  const canLaunchApp = useCallback(
    () =>
      hasSoFClients() &&
      (getLaunchableSofClients()?.length === 1 ||
        getAppSettingByKey("LAUNCH_AFTER_PATIENT_CREATION")),
    [hasSoFClients, getLaunchableSofClients, getAppSettingByKey],
  );

  const handleLaunchError = useCallback(
    (message) => {
      dispatch({
        type: ACTIONS.SET_ERROR,
        payload: message || "Unable to launch application.",
      });
      toTop();
      return false;
    },
    [dispatch],
  );

  const handleLaunchApp = useCallback(
    (rowData, launchParams) => {
      if (!launchParams) {
        launchParams = canLaunchApp() ? getLaunchableSofClients()[0] : null;
      }
      if (!launchParams && hasMultipleLaunchableSoFClients()) {
        dispatch({
          type: ACTIONS.OPEN_LAUNCH_INFO_MODAL,
          payload: { currentRow: rowData },
        });
        return;
      }
      const launchURL = _getLaunchURL(rowData?.id, launchParams);
      if (!launchURL) {
        handleLaunchError(
          "Unable to launch application. Missing launch URL. Missing configurations.",
        );
        return false;
      }
      dispatch({
        type: ACTIONS.SET_LAUNCH_URL,
        payload: launchURL,
      });
      sessionStorage.clear();
    },
    [
      canLaunchApp,
      appClients,
      getLaunchableSofClients,
      hasMultipleLaunchableSoFClients,
      handleLaunchError,
      _getLaunchURL,
    ],
  );

  const onLaunchInfoModalClose = useCallback(() => {
    dispatch({ type: ACTIONS.CLOSE_LAUNCH_INFO_MODAL });
  }, []);

  const _getNonEmptyFilters = useCallback((filters) => {
    if (!Array.isArray(filters) || isEmptyArray(filters)) return [];
    return filters.filter((item) => item.value && item.value !== "");
  }, []);

  const getActionLabel = useCallback(
    (filters) => {
      const totalFilterCount = getSearchableFields().length;
      return _getNonEmptyFilters(filters).length === totalFilterCount
        ? constants.CREATE_BUTTON_LABEL
        : constants.LAUNCH_BUTTON_LABEL;
    },
    [getSearchableFields, _getNonEmptyFilters],
  );

  const getNoDataText = useCallback(
    (filters) => {
      let text = "No matching record found.<br/>";
      const nonEmptyFilters = _getNonEmptyFilters(filters);
      const searchFields = getSearchableFields();
      const totalFilterCount = searchFields.length;
      const searchFieldNames = searchFields
        .map((field) => field.title)
        .join(", ");
      if (nonEmptyFilters.length < totalFilterCount) {
        text += `Try entering all ${searchFieldNames}.`;
      } else if (nonEmptyFilters.length === totalFilterCount) {
        text += `Click on ${constants.CREATE_BUTTON_LABEL} button to create new patient`;
      }
      return text;
    },
    [getSearchableFields, _getNonEmptyFilters],
  );

  const onFiltersDidChange = useCallback(
    (filters) => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
      filterTimeoutRef.current = setTimeout(() => {
        // guard against non-array filters before calling .filter()
        const safeFilters = Array.isArray(filters) ? filters : [];
        const isEmpty = !safeFilters.filter((f) => f.value).length;
        if (isEmpty) {
          dispatch({
            type: ACTIONS.RESET_SEARCH,
            payload: { currentFilters: {} },
          });
        } else {
          dispatch({
            type: ACTIONS.UPDATE_FILTERS,
            payload: {
              currentFilters: safeFilters,
              noDataText: getNoDataText(safeFilters),
              actionLabel: getActionLabel(safeFilters),
            },
          });
        }
        paginationDispatch({ type: "reset" });
        tableRef.current?.onQueryChange();
      }, 200);
    },
    [getNoDataText, getActionLabel],
  );

  const handleErrorCallback = useCallback(
    (e) => {
      const oStatus = constants.objErrorStatus[parseInt(e?.status)];
      if (oStatus) {
        dispatch({
          type: ACTIONS.SET_ERROR,
          payload: "Logging out due to error.",
        });
        window.location = oStatus.logoutURL;
        return;
      }
      dispatch({
        type: ACTIONS.SET_ERROR,
        payload: isString(e)
          ? e
          : e && e.message
            ? e.message
            : "Error occurred processing data",
      });
    },
    [dispatch],
  );

  const shouldHideMoreMenu = useCallback(() => {
    if (!hasAppSettings()) return true;
    return (
      isEmptyArray(appSettings[constants.MORE_MENU_KEY]) ||
      !appSettings[constants.MORE_MENU_KEY].find(
        (item) => item && String(item).replace(/[\[\]"']/g, "") !== "",
      )
    );
  }, [hasAppSettings, appSettings]);

  const shouldShowMenuItem = useCallback(
    (id) => {
      let arrMenu = getAppSettingByKey(constants.MORE_MENU_KEY);
      if (isEmptyArray(arrMenu)) return false;
      return !!arrMenu.find(
        (item) => String(item).toLowerCase() === String(id).toLowerCase(),
      );
    },
    [getAppSettingByKey],
  );

  const getMenuItems = useCallback(
    () =>
      !isEmptyArray(constants.defaultMenuItems)
        ? constants.defaultMenuItems.filter((item) =>
            shouldShowMenuItem(item.id),
          )
        : [],
    [shouldShowMenuItem],
  );

  const handleDeSelectRow = useCallback(() => {
    const selectedRows = document.querySelectorAll(".selected-row");
    selectedRows.forEach((row) => row.classList.remove("selected-row"));
  }, []);

  const handleMenuClose = useCallback(() => {
    handleDeSelectRow();
    dispatch({ type: ACTIONS.CLOSE_MENU });
  }, [handleDeSelectRow]);

  const handleToggleDetailPanel = useCallback((rowData) => {
    tableRef.current.onToggleDetailPanel(
      [
        tableRef.current.dataManager.sortedData.findIndex(
          (item) => item.id === rowData.id,
        ),
      ],
      tableRef.current.props.detailPanel[0].render,
    );
  }, []);

  const handleMenuSelect = useCallback(
    (event) => {
      event.stopPropagation();
      const selectedTarget = event.currentTarget?.getAttribute("datatopic");
      if (!selectedTarget) return;

      // Capture currentRow at selection time before any close/cleanup resets it
      const row = currentRowRef.current;
      selectedMenuItemRef.current = selectedTarget;

      dispatch({
        type: ACTIONS.SET_SELECTED_MENU_ITEM,
        payload: selectedTarget,
      });

      if (!row) return;
      // Defer until after the dispatch re-render settles
      setTimeout(() => {
        row.tableData.showDetailPanel = true;
        handleToggleDetailPanel(row);
      }, 250);
    },
    [handleToggleDetailPanel],
  );
  const _getSelectedItemComponent = useCallback(
    (selectedMenuItemKey, rowData) => {
      if (!selectedMenuItemKey) return null;
      let selectedItem = constants.defaultMenuItems.find(
        (item) =>
          String(item.id).toLowerCase() ===
          String(selectedMenuItemKey).toLowerCase(),
      );
      if (selectedItem) {
        return selectedItem.component(rowData);
      }
      return null;
    },
    [],
  );

  const getDetailPanelContent = useCallback(
    (data) =>
      _getSelectedItemComponent(selectedMenuItemRef.current, data?.rowData),
    [_getSelectedItemComponent],
  );

  const onDetailPanelClose = useCallback(
    (data) => {
      handleToggleDetailPanel(data.rowData);
      handleMenuClose();
    },
    [handleToggleDetailPanel, handleMenuClose],
  );

  const onTestPatientsCheckboxChange = useCallback((event) => {
    paginationDispatch({ type: "reset" });
    dispatch({
      type: ACTIONS.TOGGLE_TEST_PATIENTS,
      payload: event.target.checked,
    });
    if (tableRef.current) tableRef.current.onQueryChange();
  }, []);

  const onMyPatientsCheckboxChange = useCallback(
    (event, changeEvent) => {
      paginationDispatch({ type: "reset" });
      if (event && event.target && !event.target.checked) {
        dispatch({
          type: ACTIONS.SET_CARE_TEAM_PATIENT_IDS,
          payload: null,
        });
      } else if (user && user.followingPatientIds) {
        dispatch({
          type: ACTIONS.SET_CARE_TEAM_PATIENT_IDS,
          payload: user.followingPatientIds,
        });
      }
      if (tableRef.current) tableRef.current.onQueryChange();
      if (changeEvent) changeEvent();
    },
    [user],
  );

  const shouldShowLegend = useCallback(
    () => contextState.containNoPMPRow,
    [contextState.containNoPMPRow],
  );

  const _handleRefresh = useCallback(() => {
    dispatch({
      type: ACTIONS.RESET_SEARCH,
      payload: { currentFilters: defaultFilters },
    });
    paginationDispatch({ type: "reset" });
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  }, [defaultFilters]);

  const _getPatientSearchURL = useCallback(
    (data, params, fieldsConfig) => {
      const oData = new RowData(data);
      const searchInactive = params && params.searchInactive;
      const useActiveFlag = params && params.useActiveFlag;
      const isUpdate = params && params.isUpdate;

      if (isUpdate && data.id) {
        return `/fhir/Patient/${data.id}`;
      }

      const isValidValue = (value, field) => {
        if (!value) return false;
        if (field.isDate || field.type === "date") {
          return dayjs(value).isValid();
        }
        return String(value).trim() !== "";
      };

      const buildSearchParams = (isExternal = false) => {
        const searchParams = [];
        fieldsConfig.forEach((field) => {
          const dataKey = field.dataKey || field.name;
          const value = oData.getField(dataKey) || oData.data[dataKey];
          if (!isValidValue(value, field)) return;
          const trimmedValue = String(value).trim();
          if (isExternal) {
            const prefix = field.externalPrefix || "";
            const fieldKey = field.externalKey || field.fhirKey;
            if (!fieldKey) {
              console.warn(
                "Missing FHIR field key for filter value ",
                trimmedValue,
              );
            } else searchParams.push(`${fieldKey}=${prefix}${trimmedValue}`);
          } else {
            if (!field.fhirKey) {
              console.warn(
                "Missing FHIR field key for filter value ",
                trimmedValue,
              );
            } else {
              if (field.exactMatch) {
                const variations = [
                  trimmedValue,
                  trimmedValue.toLowerCase(),
                  trimmedValue.toUpperCase(),
                  capitalizeFirstLetter(trimmedValue),
                ].join(",");
                searchParams.push(`${field.fhirKey}:exact=${variations}`);
              } else {
                searchParams.push(`${field.fhirKey}=${trimmedValue}`);
              }
            }
          }
        });
        return searchParams;
      };

      if (needExternalAPILookup()) {
        const dataURL = "/external_search/Patient";
        const externalParams = buildSearchParams(true);
        return `${dataURL}?${externalParams.join("&")}`;
      }

      const fhirParams = buildSearchParams(false);
      let url = `/fhir/Patient?${fhirParams.join("&")}`;

      if (searchInactive) {
        url += `&inactive_search=true`;
      } else if (useActiveFlag) {
        url += `&active=true`;
      }

      return url;
    },
    [needExternalAPILookup],
  );

  const _formatData = useCallback(
    (data) => {
      if (!data) return [];
      const dataArray = Array.isArray(data) ? data : [data];
      return dataArray.map((item, index) => {
        const source = item.resource || item;
        let rowData = {
          id: jsonpath.value(source, "$.id") ?? index,
          resource: source,
          identifier: jsonpath.value(source, "$.identifier") || [],
        };
        columns.forEach((col) => {
          if (!col.field) return;
          const dataType = String(col.dataType).toLowerCase();
          let value = col.expr
            ? jsonpath.nodes(source, col.expr)[0]?.value || null
            : null;

          if (dataType === "date")
            value = value ? getLocalDateTimeString(value) : "-";
          if (dataType === "timeago" && value)
            value = getTimeAgoDisplay(new Date(value));
          if (col.field === "next_message")
            value = isInPast(value) ? "-" : getLocalDateTimeString(value);

          rowData[col.field] = value ?? col.defaultValue ?? "-";
        });
        return rowData;
      });
    },
    [columns],
  );

  const _notInPDMP = useCallback(
    (rowData) => {
      if (getAppSettingByKey("ONLY_CREATE_PATIENT_IF_FOUND_EXTERNAL"))
        return false;
      if (!rowData) return false;
      if (isEmptyArray(rowData.identifier)) return true;
      return !rowData.identifier.find((item) => {
        return item.system === constants.PDMP_SYSTEM_IDENTIFIER && item.value;
      });
    },
    [getAppSettingByKey],
  );

  const _setNoPMPFlag = useCallback(
    (data) => {
      if (isEmptyArray(data)) return false;
      let hasNoPMPRow =
        data.filter((rowData) => _notInPDMP(rowData)).length > 0;
      if (hasNoPMPRow) {
        dispatch({
          type: ACTIONS.SET_CONTAIN_NO_PMP_FLAG,
          payload: true,
        });
      }
    },
    [_notInPDMP],
  );

  const _getDefaultSortColumn = useCallback(() => {
    const cols = columns;
    if (isEmptyArray(cols)) return null;
    const defaultSortColumn = cols.find((column) => column.defaultSort);
    if (defaultSortColumn) return defaultSortColumn;
    return null;
  }, [columns]);

  const _getSortDirectives = useCallback(
    (orderByCollection) => {
      let sortField = null,
        sortDirection = null;
      if (!isEmptyArray(orderByCollection)) {
        const cols = columns;
        const orderField = orderByCollection[0];
        const orderByField = cols[orderField.orderBy];
        if (orderByField) {
          const matchedColumn = cols.find(
            (col) => col.field === orderByField.field,
          );
          if (matchedColumn && matchedColumn.sortBy) {
            sortField = matchedColumn.sortBy;
          } else
            sortField =
              constants.DATA_TO_FHIR_FIELD_MAPPINGS[orderByField.field] ??
              orderByField.field;
          if (sortField) sortDirection = orderField.orderDirection;
        }
      }
      if (!sortField) {
        const returnObj = _getDefaultSortColumn();
        sortField = returnObj
          ? (constants.DATA_TO_FHIR_FIELD_MAPPINGS[returnObj.field] ??
            returnObj.field)
          : "_lastUpdated";
        sortDirection = returnObj ? returnObj.defaultSort : "desc";
      }
      if (!sortDirection) {
        sortDirection = "desc";
      }
      return { sortField, sortDirection };
    },
    [columns, _getDefaultSortColumn],
  );

  const _getSearchString = useCallback(() => {
    let filterBy = [];
    if (!isEmptyArray(contextState.currentFilters)) {
      contextState.currentFilters.forEach((item) => {
        const mappedField = constants.DATA_TO_FHIR_FIELD_MAPPINGS[item.field];
        const fhirField = mappedField ? mappedField : item.field;
        if (!fhirField) {
          console.warn("Search param missing field key for value ", item.value);
        }
        if (item.value) {
          filterBy.push(`${fhirField}${":contains"}=${item.value}`);
        }
      });
    }
    return filterBy.length ? filterBy.join("&") : "";
  }, [contextState.currentFilters]);

  const _getPatientListQueryURL = useCallback(
    (query) => {
      const { sortField, sortDirection } = _getSortDirectives(
        query.orderByCollection,
      );
      const sortMinus = sortField && sortDirection !== "asc" ? "-" : "";
      const searchString = _getSearchString();
      let apiURL = `/fhir/Patient?_include=Patient:link&_total=accurate&_count=${pagination.pageSize}`;
      if (!isEmptyArray(contextState.patientIdsByCareTeamParticipant)) {
        apiURL += `&_id=${contextState.patientIdsByCareTeamParticipant.join(",")}`;
      }
      if (getAppSettingByKey("ENABLE_FILTER_FOR_TEST_PATIENTS")) {
        if (!contextState.filterByTestPatients) {
          apiURL += `&_security:not=HTEST`;
        }
      }
      if (
        pagination.pageNumber > pagination.prevPageNumber &&
        pagination.nextPageURL
      ) {
        apiURL = pagination.nextPageURL;
      } else if (
        pagination.pageNumber < pagination.prevPageNumber &&
        pagination.prevPageURL
      ) {
        apiURL = pagination.prevPageURL;
      }
      if (searchString && apiURL.indexOf("contains") === -1)
        apiURL += `&${searchString}`;
      if (sortField && apiURL.indexOf("sort") === -1)
        apiURL += `&_sort=${sortMinus}${sortField}`;
      return apiURL;
    },
    [
      _getSortDirectives,
      _getSearchString,
      pagination,
      contextState.patientIdsByCareTeamParticipant,
      contextState.filterByTestPatients,
      getAppSettingByKey,
    ],
  );

  const _getLinksFromResponse = useCallback((response) => {
    if (!response) return {};
    let responseSelfLink = !isEmptyArray(response.link)
      ? response.link.filter((item) => item.relation === "self")
      : null;
    let responseNextLink = !isEmptyArray(response.link)
      ? response.link.filter((item) => item.relation === "next")
      : null;
    let responsePrevLink = !isEmptyArray(response.link)
      ? response.link.filter((item) => item.relation === "previous")
      : null;
    let hasSelfLink = !isEmptyArray(responseSelfLink);
    let hasNextLink = !isEmptyArray(responseNextLink);
    let hasPrevLink = !isEmptyArray(responsePrevLink);
    let newNextURL = hasNextLink ? responseNextLink[0].url : "";
    let newPrevURL = hasPrevLink
      ? responsePrevLink[0].url
      : hasSelfLink
        ? responseSelfLink[0].url
        : "";
    return {
      nextURL: newNextURL,
      previousURL: newPrevURL,
      selfURL: !isEmptyArray(responseSelfLink) ? responseSelfLink[0].url : "",
    };
  }, []);

  const getTableOptions = useCallback(
    (themeArg) => ({
      ...constants.defaultTableOptions,
      headerStyle: {
        backgroundColor: themeArg.palette.primary.lightest,
        padding: themeArg.spacing(1, 2, 1),
      },
      rowStyle: (rowData) => ({
        backgroundColor:
          needExternalAPILookup() && _notInPDMP(rowData)
            ? themeArg.palette.primary.disabled
            : "#FFF",
      }),
      actionsCellStyle: {
        paddingLeft: themeArg.spacing(1),
        paddingRight: themeArg.spacing(1),
        justifyContent: "center",
      },
      detailPanelType: "single",
    }),
    [needExternalAPILookup, _notInPDMP],
  );

  const tableActions = useMemo(() => {
    const actions = !shouldHideMoreMenu()
      ? [
          {
            icon: () => <MoreHorizIcon color="primary" />,
            onClick: (e, row) => {
              e.stopPropagation();
              const parentRow = e?.currentTarget?.closest("tr");
              if (parentRow) {
                parentRow.classList.add("selected-row");
              }
              dispatch({ type: ACTIONS.OPEN_MENU, payload: row });
            },
            tooltip: "More",
          },
        ]
      : [];
    if (isEmptyArray(appClients)) return actions;
    return [
      ...appClients
        .filter((c) => !c.standalone)
        .map((c) => ({
          icon: () => (
            <span
              className="action-button"
              style={{ background: theme.palette.primary.main }}
            >
              {c.label}
            </span>
          ),
          onClick: (event, rowData) => {
            event.stopPropagation();
            const hasLastAccessedField =
              columns.filter(
                (column) =>
                  String(column.field).toLowerCase() === "last_accessed",
              ).length > 0;
            if (hasLastAccessedField) {
              putPatientData(
                rowData.id,
                rowData.resource,
                (e) => {
                  handleErrorCallback(e);
                  handleLaunchApp(rowData, c);
                },
                () => handleLaunchApp(rowData, c),
              );
              return;
            }
            handleLaunchApp(rowData, c);
          },
          tooltip: `Launch ${c.id}`,
        })),
      ...actions,
    ];
  }, [
    appClients,
    theme,
    columns,
    shouldHideMoreMenu,
    handleLaunchApp,
    handleErrorCallback,
  ]);

  const getTableEditableOptions = useCallback(
    () => ({
      isDeleteHidden: () =>
        appSettings && !appSettings["ENABLE_PATIENT_DELETE"],
      onRowDelete: (oldData) =>
        fetchData("/fhir/Patient/" + oldData.id, {
          method: "DELETE",
        })
          .then(() => {
            setTimeout(() => {
              const dataDelete = [...contextState.data];
              const target = dataDelete.find((el) => el.id === oldData.id);
              const index = dataDelete.indexOf(target);
              dataDelete.splice(index, 1);
              dispatch({
                type: ACTIONS.SET_DATA,
                payload: dataDelete,
              });
            }, 500);
          })
          .catch(() => {
            dispatch({
              type: ACTIONS.SET_ERROR,
              payload: "Unable to remove patient from the list.",
            });
          }),
    }),
    [appSettings, contextState.data],
  );

  const getTableRowEvent = useCallback(
    (event, rowData) => {
      event.stopPropagation();
      if (!hasSoFClients()) return;
      handleLaunchApp(rowData);
    },
    [hasSoFClients, handleLaunchApp],
  );

  const getTableLocalizations = useCallback(
    () => ({
      header: { actions: "" },
      pagination: { labelRowsSelect: "rows" },
      body: {
        deleteTooltip: "Remove from the list",
        editRow: {
          deleteText: needExternalAPILookup()
            ? "Are you sure you want to remove this patient from the list? (You can add them back later by searching for them)"
            : "Are you sure you want to remove this patient from the list?",
          saveTooltip: "OK",
        },
        emptyDataSourceMessage: (
          <div
            id="emptyDataContainer"
            className="flex-center warning notice"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(contextState.noDataText),
            }}
          ></div>
        ),
      },
    }),
    [needExternalAPILookup, contextState.noDataText],
  );

  const _getFetchErrorMessage = useCallback((e, noData, isExternalLookup) => {
    const noResultErrorMessage = isExternalLookup
      ? constants.NON_PDMP_RESULT_MESSAGE
      : "Server error occurred. No result returned.  See console for detail.";
    const fetchErrorMessage = noData
      ? noResultErrorMessage
      : isExternalLookup
        ? constants.PDMP_SYSTEM_ERROR_MESSAGE
        : "Server error ocurred.  See console for detail.";
    const errorMessage =
      typeof e === "string" ? e : e && e.message ? e.message : "";
    return (
      fetchErrorMessage +
      (errorMessage
        ? `<p>Response from the system: ${errorMessage}</p>`
        : `<p>See console for detail.</p>`)
    );
  }, []);

  const _getFHIRPatientData = useCallback(
    async (rowData, isExternalLookup) =>
      fetchData(
        _getPatientSearchURL(
          rowData,
          { searchInactive: !!appSettings["REACTIVATE_PATIENT"] },
          SEARCH_FIELDS,
        ),
        {
          ...constants.searchHeaderParams,
          method: isExternalLookup ? "PUT" : "GET",
        },
        (e, status) => {
          const badSearchError =
            status && parseInt(status) > 300 && parseInt(status) < 500;
          const errorMessage = _getFetchErrorMessage(
            e,
            badSearchError ? false : true,
            isExternalLookup,
          );
          handleErrorCallback(errorMessage);
          return;
        },
      ),
    [
      _getPatientSearchURL,
      appSettings,
      SEARCH_FIELDS,
      _getFetchErrorMessage,
      handleErrorCallback,
    ],
  );

  const handleSearch = useCallback(
    async (rowData, params) => {
      if (!rowData) {
        handleLaunchError("No patient data to proceed.");
        return false;
      }

      const isReactivate = params && params.reactivate;
      const isCreateNew = params && params.createNew;
      const isExternalLookup = needExternalAPILookup();

      dispatch({ type: ACTIONS.SET_LOADING, payload: rowData });

      try {
        const bundleResult = await _getFHIRPatientData(
          rowData,
          isExternalLookup,
        );

        // Empty results
        if (isEmptyArray(bundleResult?.entry)) {
          if (isExternalLookup) {
            _handleRefresh();
            dispatch({
              type: ACTIONS.SET_ERROR,
              payload: _getFetchErrorMessage(
                "Search returns no match",
                true,
                isExternalLookup,
              ),
            });
          }
          // For non-external with no results, fall through to create below
        } else {
          // Results found: categorize
          const entries = getSortedEntriesFromBundle(bundleResult?.entry);
          const activeEntries = getActiveEntriesFromPatientBundle(entries);
          const inactiveEntries = getInactiveEntriesFromPatientBundle(entries);
          const isInactive = !isEmptyArray(inactiveEntries);
          const shouldShowReactivatePopup =
            isInactive && getAppSettingByKey("REACTIVATE_PATIENT");

          // Multiple active matches - ambiguous, bail out
          if (activeEntries.length > 1) {
            dispatch({
              type: ACTIONS.SET_ERROR,
              payload: "Multiple matched entries found.",
            });
            return;
          }

          // Exactly one active match
          if (activeEntries.length > 0) {
            const targetEntry = _formatData(activeEntries[0])[0];
            if (!isCreateNew && canLaunchApp()) {
              // Found patient, launch directly, no create/update needed
              handleLaunchApp(targetEntry);
              return;
            }
            if (isExternalLookup) {
              // Refresh table to show the updated row
              _handleRefresh();
              return;
            }
          } else {
            // No active matches check inactive entries
            if (!isCreateNew && !isReactivate) {
              if (shouldShowReactivatePopup) {
                dispatch({
                  type: ACTIONS.UPDATE_FILTERS,
                  payload: {
                    openReactivatingModal: true,
                    openLoadingModal: false,
                  },
                });
                return;
              }
              if (inactiveEntries.length > 1) {
                dispatch({
                  type: ACTIONS.SET_ERROR,
                  payload: "Multiple matched entries found.",
                });
                return;
              }
              if (inactiveEntries.length === 1) {
                // One inactive patient found - launch directly
                handleLaunchApp(_formatData(inactiveEntries[0])[0]);
                return;
              }
            }
          }

          // Prepare rowData resource for the upcoming create/update call
          const entryToUse = entries.length
            ? entries[0]
            : getFirstResourceFromFhirBundle(bundleResult);
          rowData.resource = { ...entryToUse };
          rowData.id = entryToUse.id;
        }

        // Create or Update patient
        const oData = new RowData(rowData);
        const payload = JSON.stringify(oData.getFhirData(isCreateNew));
        const isUpdate = isReactivate || (!isCreateNew && !!rowData.id);

        const result = await fetchData(
          _getPatientSearchURL(
            rowData,
            {
              useActiveFlag: !!getAppSettingByKey("ACTIVE_PATIENT_FLAG"),
              isUpdate,
            },
            SEARCH_FIELDS,
          ),
          {
            ...constants.searchHeaderParams,
            body: payload,
            method: isUpdate ? "PUT" : "POST",
          },
          (e) => {
            dispatch({
              type: ACTIONS.SET_ERROR,
              payload: _getFetchErrorMessage(e, false, isExternalLookup),
            });
          },
        );

        const response = getFirstResourceFromFhirBundle(result);
        console.log("Patient update result: ", response);

        if (!response || !response.id) {
          const errorText = getErrorDiagnosticTextFromResponse(response);
          dispatch({
            type: ACTIONS.SET_ERROR,
            payload: _getFetchErrorMessage(errorText, !errorText),
          });
          return false;
        }

        _handleRefresh();

        if (canLaunchApp()) {
          handleLaunchApp(_formatData(response)[0]);
        }
      } catch (e) {
        console.log("handleSearch error: ", e);
        dispatch({
          type: ACTIONS.SET_ERROR,
          payload: _getFetchErrorMessage(e, false, isExternalLookup),
        });
      }
    },
    [
      needExternalAPILookup,
      _getFHIRPatientData,
      _handleRefresh,
      _getFetchErrorMessage,
      _formatData,
      _getPatientSearchURL,
      canLaunchApp,
      handleLaunchApp,
      handleLaunchError,
      getAppSettingByKey,
      SEARCH_FIELDS,
    ],
  );

  const getPatientList = useCallback(
    (query) => {
      const defaults = { data: [], page: 0, totalCount: 0 };
      return new Promise((resolve) => {
        fetchData(
          _getPatientListQueryURL(query),
          constants.noCacheParam,
          function (e) {
            paginationDispatch({ type: "empty" });
            handleErrorCallback(e);
            resolve(defaults);
          },
        )
          .then((response) => {
            if (!response || isEmptyArray(response.entry)) {
              paginationDispatch({ type: "empty" });
              resolve(defaults);
              return;
            }
            if (needExternalAPILookup()) {
              _setNoPMPFlag(response.entry);
            }
            const { nextURL, previousURL, selfURL } =
              _getLinksFromResponse(response);
            let responsePageoffset = 0;
            if (selfURL) {
              responsePageoffset = getUrlParameter(
                "_getpagesoffset",
                new URL(selfURL),
              );
            }
            let currentPage = responsePageoffset
              ? responsePageoffset / pagination.pageSize
              : 0;
            paginationDispatch({
              payload: {
                nextPageURL: nextURL,
                prevPageURL: previousURL,
                disableNextButton: !nextURL,
                disablePrevButton: pagination.pageNumber === 0,
                totalCount: response.total,
              },
            });
            let patientResources = response.entry.filter(
              (item) =>
                item.resource && item.resource.resourceType === "Patient",
            );
            let responseData = _formatData(patientResources);
            const additionalParams = getAppSettingByKey(
              "FHIR_REST_EXTRA_PARAMS_LIST",
            );
            const eligibleRequests = additionalParams
              ? additionalParams.filter(
                  (request) =>
                    typeof request === "string" ||
                    (typeof request === "object" && request.resourceType),
                )
              : [];
            const resolvedData = {
              data: responseData,
              page: currentPage,
              totalCount: response.total,
            };
            if (isEmptyArray(eligibleRequests)) {
              dispatch({ type: ACTIONS.SET_DATA, payload: responseData });
              resolve(resolvedData);
              return;
            }
            const ids = patientResources
              .map((item) => item.resource.id)
              .join(",");
            const requests = eligibleRequests.map((request) => {
              let queryString = "";
              let { resourceType, queryParams, referenceElement } = request;
              if (!referenceElement) referenceElement = "patient";
              let params = ["_count=1000", `${referenceElement}=${ids}`];
              if (typeof request === "string")
                queryString =
                  request +
                  (request.indexOf("?") !== -1 ? "" : "?") +
                  (request.indexOf("&") !== -1 ? "&" : "") +
                  `${params.join("&")}`;
              else {
                params = [...params, queryParams];
                queryString = `${resourceType}?${params.join("&")}`;
              }
              return fetchData(`/fhir/${queryString}`, constants.noCacheParam);
            });
            const patientFHIRResourceQueryResults = (async () => {
              const results = await Promise.all(requests).catch((e) => {
                throw new Error(e);
              });
              if (isEmptyArray(results)) return patientResources;
              return patientResources.map((item) => {
                let subjectId = item.resource.id;
                if (!item.resource["resources"])
                  item.resource["resources"] = [];
                results.forEach((result) => {
                  if (isEmptyArray(result.entry)) return true;
                  item.resource["resources"] = [
                    ...item.resource["resources"],
                    ...result.entry
                      .filter((o) => {
                        const matchedResource = additionalParams.filter(
                          (item) =>
                            item.resourceType &&
                            item.resourceType === o.resource.resourceType,
                        );
                        const referenceElementName =
                          matchedResource.length > 0
                            ? matchedResource[0].referenceElement
                            : "subject";
                        return (
                          o.resource &&
                          o.resource[referenceElementName] &&
                          o.resource[referenceElementName].reference &&
                          o.resource[referenceElementName].reference.split(
                            "/",
                          )[1] === subjectId
                        );
                      })
                      .map((resourceItem) => resourceItem.resource),
                  ];
                });
                return item;
              });
            })();
            patientFHIRResourceQueryResults
              .then((data) => {
                console.log("query result data ", data);
                const resultData = _formatData(data);
                dispatch({ type: ACTIONS.SET_DATA, payload: resultData });
                resolve({
                  data: resultData,
                  page: currentPage,
                  totalCount: response ? response.total : 0,
                });
              })
              .catch((e) => {
                console.log(e);
                dispatch({ type: ACTIONS.SET_DATA, payload: responseData });
                dispatch({
                  type: ACTIONS.SET_ERROR,
                  payload:
                    "Error retrieving additional FHIR resources.  See console for detail.",
                });
                resolve(resolvedData);
              });
          })
          .catch((error) => {
            console.log("Failed to retrieve data", error);
            handleErrorCallback(error);
            resolve(defaults);
          });
      });
    },
    [
      _getPatientListQueryURL,
      needExternalAPILookup,
      _setNoPMPFlag,
      _getLinksFromResponse,
      pagination,
      _formatData,
      getAppSettingByKey,
      handleErrorCallback,
    ],
  );

  const patientListProps = useMemo(
    () => ({
      columns: columns,
      errorMessage: contextState.errorMessage,
      filterRowRef: filterRowRef,
      getPatientList: getPatientList,
      isLoading: contextState.openLoadingModal,
      matomoSiteID: appSettings["MATOMO_SITE_ID"],
      searchTitle: appSettings["SEARCH_TITLE_TEXT"],
      tableProps: {
        columns: columns,
        detailPanel: [
          {
            render: (data) => {
              if (shouldHideMoreMenu()) return null;
              if (data.rowData && currentRowRef.current) {
                if (data.rowData.id !== currentRowRef.current.id) {
                  return null;
                }
              }
              return (
                <DetailPanel
                  data={data}
                  content={getDetailPanelContent(data)}
                ></DetailPanel>
              );
            },
            isFreeAction: false,
          },
        ],
        actions: tableActions,
        editable: getTableEditableOptions(),
        localization: getTableLocalizations(),
        options: getTableOptions(theme),
        onRowClick: (event, rowData) => {
          getTableRowEvent(event, rowData);
        },
        tableRef: tableRef,
      },
      userName: userName,
    }),
    [
      columns,
      contextState.errorMessage,
      contextState.openLoadingModal,
      getPatientList,
      appSettings,
      shouldHideMoreMenu,
      tableActions,
      getDetailPanelContent,
      getTableEditableOptions,
      getTableLocalizations,
      getTableOptions,
      theme,
      getTableRowEvent,
      userName,
    ],
  );

  const detailPanelProps = useMemo(
    () => ({
      currentRow: currentRowRef.current,
      detailPanelContent: getDetailPanelContent(),
      onDetailPanelClose: onDetailPanelClose,
    }),
    [getDetailPanelContent, onDetailPanelClose],
  );

  const filterRowProps = useMemo(
    () => ({
      actionLabel: contextState.actionLabel,
      handleSearch: handleSearch,
      onFiltersDidChange: onFiltersDidChange,
      fields: SEARCH_FIELDS,
    }),
    [contextState.actionLabel, handleSearch, onFiltersDidChange, SEARCH_FIELDS],
  );

  const launchDialogProps = useMemo(
    () => ({
      appClients: appClients,
      handleLaunchApp: (appClient) =>
        handleLaunchApp(currentRowRef.current, appClient),
      onLaunchDialogClose: onLaunchInfoModalClose,
      open: contextState.openLaunchInfoModal,
      title: `${
        currentRowRef.current
          ? `${currentRowRef.current.last_name}, ${currentRowRef.current.first_name}`
          : ""
      }`,
    }),
    [
      appClients,
      handleLaunchApp,
      onLaunchInfoModalClose,
      contextState.openLaunchInfoModal,
    ],
  );

  const legendProps = useMemo(
    () => ({ shouldShowLegend: shouldShowLegend }),
    [shouldShowLegend],
  );

  const menuProps = useMemo(
    () => ({
      currentRowId: contextState.currentRow?.id,
      handleMenuClose: handleMenuClose,
      handleMenuSelect: handleMenuSelect,
      menuItems: getMenuItems(),
      open: contextState.openMenu,
      shouldHideMoreMenu: shouldHideMoreMenu,
    }),
    [
      contextState.currentRow,
      handleMenuClose,
      handleMenuSelect,
      getMenuItems,
      contextState.openMenu,
      shouldHideMoreMenu,
    ],
  );

  const myPatientsProps = useMemo(
    () => ({
      enableProviderFilter: getAppSettingByKey("ENABLE_PROVIDER_FILTER"),
      myPatientsFilterLabel: getAppSettingByKey("MY_PATIENTS_FILTER_LABEL"),
      onMyPatientsCheckboxChange: onMyPatientsCheckboxChange,
      userError: userError,
    }),
    [getAppSettingByKey, onMyPatientsCheckboxChange, userError],
  );

  const paginationProps = useMemo(
    () => ({
      disabled: isEmptyArray(contextState.data),
      dispatch: paginationDispatch,
      pagination: pagination,
      tableRef: tableRef.current,
    }),
    [contextState.data, pagination],
  );

  const reactivateProps = useMemo(
    () => ({
      currentRow: contextState.currentRow,
      handleSearch: handleSearch,
      modalOpen: contextState.openReactivatingModal,
      onSubmit: () => {
        dispatch({ type: ACTIONS.CLOSE_REACTIVATING_MODAL });
        filterRowRef.current?.clear();
      },
      onModalClose: () => {
        filterRowRef.current?.clear();
      },
      patientLabel: getAppSettingByKey("MY_PATIENTS_FILTER_LABEL"),
    }),
    [
      contextState.currentRow,
      handleSearch,
      contextState.openReactivatingModal,
      getAppSettingByKey,
    ],
  );

  const testPatientProps = useMemo(
    () => ({
      enableFilterByTestPatients: getAppSettingByKey(
        "ENABLE_FILTER_FOR_TEST_PATIENTS",
      ),
      filterByTestPatientsLabel: getAppSettingByKey(
        "FILTER_FOR_TEST_PATIENTS_LABEL",
      ),
      onTestPatientsCheckboxChange: onTestPatientsCheckboxChange,
    }),
    [getAppSettingByKey, onTestPatientsCheckboxChange],
  );

  const childrenProps = useMemo(
    () => ({
      detailPanel: detailPanelProps,
      filterRow: filterRowProps,
      launchDialog: launchDialogProps,
      legend: legendProps,
      menu: menuProps,
      myPatients: myPatientsProps,
      pagination: paginationProps,
      patientList: patientListProps,
      reactivate: reactivateProps,
      testPatient: testPatientProps,
    }),
    [
      detailPanelProps,
      filterRowProps,
      launchDialogProps,
      legendProps,
      menuProps,
      myPatientsProps,
      paginationProps,
      patientListProps,
      reactivateProps,
      testPatientProps,
    ],
  );
  useEffect(() => {
    selectedMenuItemRef.current = contextState.selectedMenuItem;
  }, [contextState.selectedMenuItem]);

  useEffect(() => {
    currentRowRef.current = contextState.currentRow;
  }, [contextState.currentRow]);

  useEffect(() => {
    if (!contextState.launchURL) return;
    setTimeout(() => {
      window.location = contextState.launchURL;
      dispatch({ type: ACTIONS.RESET_LAUNCH_URL });
    }, 250);
  }, [contextState.launchURL]);

  useEffect(() => {
    const handlePopState = () => {
      dispatch({ type: ACTIONS.RESET_LAUNCH_URL });
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    };
  }, []);

  return (
    <PatientListContext.Provider
      value={{
        appSettings,
        childrenProps,
        contextState,
        dispatch,
        filterRowRef,
        tableRef,
        user,
        userName,
      }}
    >
      <PatientListContext.Consumer>
        {(settings) => {
          if (Object.keys(settings.appSettings).length > 0) return children;
          return (
            <div style={{ display: "flex", gap: "16px 16px", padding: "24px" }}>
              Loading... <CircularProgress color="primary"></CircularProgress>
            </div>
          );
        }}
      </PatientListContext.Consumer>
    </PatientListContext.Provider>
  );
}

PatientListContextProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.element]),
};

/*
 * helper function to access application setting context
 */
export function usePatientListContext() {
  const context = useContext(PatientListContext);
  if (context === undefined) {
    throw new Error("Context must be used within a Provider");
  }
  return context;
}
