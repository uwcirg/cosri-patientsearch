import React, { useContext, useRef } from "react";
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
let filterIntervalId = 0;
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
  const menuItems = constants.defaultMenuItems;
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
  const [pagination, paginationDispatch] = React.useReducer(
    paginationReducer,
    constants.defaultPagination
  );
  const contextReducer = (contextState, action) => {
    if (!action) return contextState;
    const keys = Object.keys(action);
    if (!keys || !keys.length) return contextState;
    let updatedVars = {};
    keys.forEach((key) => {
      updatedVars[key] = action[key];
    });
    return {
      ...contextState,
      ...updatedVars,
    };
  };
  const [contextState, contextStateDispatch] = React.useReducer(
    contextReducer,
    {
      data: [],
      patientIdsByCareTeamParticipant: hasFlagForCheckbox(
        constants.FOLLOWING_FLAG
      )
        ? user && user.followingPatientIds
          ? user.followingPatientIds
          : null
        : null,
      openLoadingModal: false,
      openMenu: false,
      openReactivatingModal: false,
      openLaunchInfoModal: false,
      containNoPMPRow: false,
      selectedMenuItem: "",
      currentRow: null,
      currentFilters: constants.defaultFilters,
      filterByTestPatients: false,
      errorMessage: isEmptyArray(appClients)
        ? "No SoF client match the user role(s) found"
        : "",
      actionLabel: constants.LAUNCH_BUTTON_LABEL,
      noDataText: "No record found.",
    }
  );

  const getColumns = () => {
    const configColumns = getAppSettingByKey("DASHBOARD_COLUMNS");
    const defaultSearchFields = constants.defaultSearchableFields;
    const isValidConfig = !isEmptyArray(configColumns);
    let cols = isValidConfig ? configColumns : constants.defaultColumns;
    if (!isValidConfig) {
      console.log("invalid columns via config. Null or not an array.");
    }
    const hasIdField = cols.find((col) => col.field === "id");
    //columns must include an id field, add if not present
    if (!hasIdField)
      cols.push({
        label: "id",
        hidden: true,
        expr: "$.id",
      });
    let returnColumns = cols.map((column, index) => {
      const fieldName = column.label.toLowerCase().replace(/\s/g, "_");
      column.title = column.label;
      column.field = fieldName;
      if (fieldName === "id" && !hasIdField) {
        column.defaultValue = index;
      }
      /* eslint-disable react/no-unknown-property */
      column.emptyValue = () => <div datacolumn={`${column.label}`}>--</div>;
      column.render = (rowData) => (
        /* eslint-disable react/no-unknown-property */
        <div datacolumn={`${column.label}`}>{rowData[fieldName]}</div>
      );
      column.searchable =
        defaultSearchFields.indexOf(fieldName.toLowerCase()) !== -1 ||
        !!column.searchable;
      return column;
    });
    const sortByQueryString = getUrlParameter("sort_by");
    const sortDirectionQueryString = getUrlParameter("sort_direction");
    // see if a column matched the sort field name specified by URL query string
    const matchedColumn = returnColumns.find(
      (column) => column.field === sortByQueryString
    );
    if (matchedColumn) {
      // if matched column found, set it as the default sort column
      returnColumns = returnColumns.map((column) => {
        if (column.field === matchedColumn.field) {
          // set sort direction if specified via URL query string
          // otherwise use the column's default sort if available (otherwise 'asc' by default)
          column.defaultSort = sortDirectionQueryString
            ? sortDirectionQueryString
            : column.defaultSort
            ? column.defaultSort
            : "asc";
        } else {
          column.defaultSort = null;
        }
        return column;
      });
    }
    return returnColumns;
  };
  const getSearchableFields = () => {
    const columns = getColumns();
    if (isEmptyArray(columns)) return [];
    return columns.filter((column) => column.searchable);
  };
  const needExternalAPILookup = () => {
    return getAppSettingByKey("EXTERNAL_FHIR_API");
  };
  const hasSoFClients = () => {
    return !isEmptyArray(appClients);
  };
  const hasMultipleSoFClients = () => {
    return hasSoFClients() && appClients.length > 1;
  };
  // if only one SoF client, use its launch params
  // or param specified launching first client app
  const canLaunchApp = () =>
    hasSoFClients() &&
    (appClients.length === 1 ||
      getAppSettingByKey("LAUNCH_AFTER_PATIENT_CREATION"));
  const handleLaunchApp = (rowData, launchParams) => {
    if (!launchParams) {
      launchParams = canLaunchApp() ? appClients[0] : null;
    }
    // if no launch params specifieid, need to handle multiple SoF clients that can be launched
    // open a dialog here so user can select which one to launch?
    if (!launchParams && hasMultipleSoFClients()) {
      contextStateDispatch({
        currentRow: rowData,
        openLaunchInfoModal: true,
      });
      return;
    }
    let launchURL = _getLaunchURL(rowData?.id, launchParams);
    if (!launchURL) {
      handleLaunchError(
        "Unable to launch application. Missing launch URL. Missing configurations."
      );
      return false;
    }
    contextStateDispatch({
      currentRow: null,
      openLoadingModal: true,
    });
    sessionStorage.clear();
    window.location = launchURL;
  };
  const handleLaunchError = (message) => {
    contextStateDispatch({
      errorMessage: message || "Unable to launch application.",
    });
    toTop();
    return false;
  };
  const onLaunchDialogClose = () => {
    contextStateDispatch({
      openLaunchInfoModal: false,
      currentRow: null,
    });
  };
  const onFiltersDidChange = (filters) => {
    clearTimeout(filterIntervalId);
    filterIntervalId = setTimeout(function () {
      if (_containEmptyFilter(filters)) {
        _handleRefresh();
        return filters;
      }
      contextStateDispatch({
        errorMessage: "",
        currentFilters: filters,
        noDataText: getNoDataText(filters),
        actionLabel: getActionLabel(filters),
      });
      _resetPaging();
      if (tableRef && tableRef.current) tableRef.current.onQueryChange();
      return filters;
    }, 200);
  };
  const getActionLabel = (filters) => {
    const totalFilterCount = getSearchableFields().length;
    return _getNonEmptyFilters(filters).length === totalFilterCount
      ? constants.CREATE_BUTTON_LABEL
      : constants.LAUNCH_BUTTON_LABEL;
  };
  const getNoDataText = (filters) => {
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
  };
  const handleErrorCallback = (e, contextParams = {}) => {
    const oStatus = constants.objErrorStatus[parseInt(e?.status)];
    if (oStatus) {
      contextStateDispatch({
        ...contextParams,
        errorMessage: `${oStatus.text}. Logging out...`,
      });
      window.location = oStatus.logoutURL;
      return;
    }
    contextStateDispatch({
      ...contextParams,
      errorMessage: isString(e)
        ? e
        : e && e.message
        ? e.message
        : "Error occurred processing data",
    });
  };
  const getMenuItems = () => {
    return !isEmptyArray(menuItems)
      ? menuItems.filter((item) => shouldShowMenuItem(item.id))
      : [];
  };
  const handleMenuClick = (event, rowData) => {
    event.stopPropagation();
    const parentRow = event.currentTarget.closest("tr");
    if (parentRow) {
      parentRow.classList.add("selected-row");
    }
    contextStateDispatch({
      currentRow: rowData,
      openMenu: true
    });
  };
  const handleDeSelectRow = () => {
    const selectedRow = document.querySelector(".selected-row");
    if (selectedRow) selectedRow.classList.remove("selected-row");
  };
  const handleMenuClose = () => {
    handleDeSelectRow();
    contextStateDispatch({
      openMenu: false
    });
  };
  const handleMenuSelect = (event) => {
    event.stopPropagation();
    const selectedTarget = event.currentTarget?.getAttribute("datatopic");
    if (!selectedTarget) return;
    contextStateDispatch({
      selectedMenuItem: selectedTarget,
    });
    if (!contextState.currentRow) return;
    setTimeout(() => {
      contextState.currentRow.tableData.showDetailPanel = true;
      handleToggleDetailPanel(contextState.currentRow);
    }, 200);
  };
  const handleToggleDetailPanel = (rowData) => {
    tableRef.current.onToggleDetailPanel(
      [
        tableRef.current.dataManager.sortedData.findIndex(
          (item) => item.id === rowData.id
        ),
      ],
      tableRef.current.props.detailPanel[0].render
    );
  };
  const getDetailPanelContent = (data) =>
    _getSelectedItemComponent(contextState.selectedMenuItem, data.rowData);
  const onDetailPanelClose = (data) => {
    handleToggleDetailPanel(data.rowData);
    handleMenuClose();
    contextStateDispatch({
      currentRow: null
    });
  };
  const shouldHideMoreMenu = () => {
    if (!hasAppSettings()) return true;
    return (
      isEmptyArray(appSettings[constants.MORE_MENU_KEY]) ||
      !appSettings[constants.MORE_MENU_KEY].find((item) => item && item !== "")
    );
  };
  const shouldShowMenuItem = (id) => {
    let arrMenu = getAppSettingByKey(constants.MORE_MENU_KEY);
    if (isEmptyArray(arrMenu)) return false;
    return !!arrMenu.find(
      (item) => String(item).toLowerCase() === String(id).toLowerCase()
    );
  };
  const onTestPatientsCheckboxChange = (event) => {
    _resetPaging();
    contextStateDispatch({
      filterByTestPatients: event.target.checked,
    });
    if (tableRef.current) tableRef.current.onQueryChange();
  };
  const onMyPatientsCheckboxChange = (event, changeEvent) => {
    _resetPaging();
    if (event && event.target && !event.target.checked) {
      contextStateDispatch({
        patientIdsByCareTeamParticipant: null,
      });
    } else if (user && user.followingPatientIds) {
      contextStateDispatch({
        patientIdsByCareTeamParticipant: user.followingPatientIds,
      });
    }
    if (tableRef.current) tableRef.current.onQueryChange();
    if (changeEvent) changeEvent();
  };
  const shouldShowLegend = () => contextState.containNoPMPRow;
  const _getSelectedItemComponent = (selectedMenuItemKey, rowData) => {
    if (!selectedMenuItemKey) return null;
    let selectedItem = menuItems.find(
      (item) =>
        String(item.id).toLowerCase() ===
        String(selectedMenuItemKey).toLowerCase()
    );
    if (selectedItem) {
      return selectedItem.component(rowData);
    }
    return null;
  };
  const _getDefaultSortColumn = () => {
    const cols = getColumns();
    if (isEmptyArray(cols)) return null;
    const defaultSortColumn = cols.find((column) => column.defaultSort);
    if (defaultSortColumn) return defaultSortColumn;
    return null;
  };
  const _resetPaging = () => {
    paginationDispatch({ type: "reset" });
  };
  const _handleRefresh = (contextParams = {}) => {
    contextStateDispatch({
      currentRow: null,
      currentFilters: constants.defaultFilters,
      errorMessage: "",
      ...contextParams,
    });
    _resetPaging();
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };
  const _getLaunchURL = (patientId, launchParams) => {
    if (!patientId) {
      console.log("Missing information: patient Id");
      return "";
    }
    launchParams = launchParams || {};
    return getAppLaunchURL(patientId, { ...launchParams, ...appSettings });
  };
  const _getPatientSearchURL = (data, params) => {
    const oData = new RowData(data);
    const fName = String(oData.firstName).trim();
    const lName = String(oData.lastName).trim();
    const birthDate = oData.birthDate;
    if (needExternalAPILookup()) {
      const dataURL = "/external_search/Patient";
      // remove leading/trailing spaces from first/last name data sent to patient search API
      let params = [
        `subject:Patient.name.given=${fName}`,
        `subject:Patient.name.family=${lName}`,
        `subject:Patient.birthdate=eq${birthDate}`,
      ];
      return `${dataURL}?${params.join("&")}`;
    }
    const searchInactive = params && params.searchInactive;
    const useActiveFlag = params && params.useActiveFlag;
    const isUpdate = params && params.isUpdate;
    if (isUpdate && data.id) {
      return `/fhir/Patient/${data.id}`;
    }
    const matchFNames = [
      fName,
      fName.toLowerCase(),
      fName.toUpperCase(),
      capitalizeFirstLetter(fName),
    ].join(",");
    const matchLNames = [
      lName,
      lName.toLowerCase(),
      lName.toUpperCase(),
      capitalizeFirstLetter(lName),
    ].join(",");
    // lookup patient with exact match
    //e.g., /fhir/Patient?given:exact=Test,test,TEST&family:exact=Bubblegum,bubblegum,BUBBLEGUM&birthdate=2000-01-01
    let url = `/fhir/Patient?given:exact=${matchFNames}&family:exact=${matchLNames}&birthdate=${birthDate}`;
    if (searchInactive) {
      url += `&inactive_search=true`;
    } else {
      if (useActiveFlag) {
        url += `&active=true`;
      }
    }
    return url;
  };
  const _formatData = (data) => {
    if (data && !Array.isArray(data)) {
      data = [data];
    }
    return !isEmptyArray(data)
      ? data.map((item, index) => {
          const source = item.resource ? item.resource : item;
          const cols = getColumns() ?? [];
          let rowData = {
            id: jsonpath.value(source, "$.id") ?? index,
            resource: source,
            identifier: jsonpath.value(source, "$.identifier") || [],
          };
          cols.forEach((col) => {
            const dataType = String(col.dataType).toLowerCase();
            let nodes;
            try {
              nodes = jsonpath.nodes(source, col.expr);
            } catch (e) {
              console.log("JSON path source ", source);
              console.log("Error interpreting JSON path ", e);
            }
            let value = !isEmptyArray(nodes)
              ? nodes[nodes.length - 1].value
              : null;

            if (dataType === "date") {
              value = value ? getLocalDateTimeString(value) : "--";
            }
            if (dataType === "timeago" && value) {
              value = value ? getTimeAgoDisplay(new Date(value)) : "--";
            }
            if (col.field === "next_message") {
              // TODO maybe a specific data type to handle not displaying past message?
              value = isInPast(value) ? "--" : getLocalDateTimeString(value);
            }
            if (col.field) rowData[col.field] = value ?? col.defaultValue;
          });
          return rowData;
        })
      : [];
  };
  const _containEmptyFilter = (filters) => !_getNonEmptyFilters(filters).length;
  const _getNonEmptyFilters = (filters) => {
    if (isEmptyArray(filters)) return [];
    return filters.filter((item) => item.value && item.value !== "");
  };
  const _notInPDMP = (rowData) => {
    if (!rowData) return false;
    if (isEmptyArray(rowData.identifier)) return true;
    return !rowData.identifier.find((item) => {
      return item.system === constants.PDMP_SYSTEM_IDENTIFIER && item.value;
    });
  };
  const _setNoPMPFlag = (data) => {
    if (isEmptyArray(data)) return false;
    let hasNoPMPRow =
      data.filter((rowData) => {
        return _notInPDMP(rowData);
      }).length > 0;
    //legend will display if contain no pmp row flag is set
    if (hasNoPMPRow) {
      contextStateDispatch({
        containNoPMPRow: true,
      });
    }
  };
  const _getSortDirectives = (orderByCollection) => {
    let sortField = null,
      sortDirection = null;
    if (!isEmptyArray(orderByCollection)) {
      const cols = getColumns();
      const orderField = orderByCollection[0];
      const orderByField = cols[orderField.orderBy]; // orderBy is the index of the column
      if (orderByField) {
        const matchedColumn = cols.find(
          (col) => col.field === orderByField.field
        );
        if (matchedColumn && matchedColumn.sortBy) {
          sortField = matchedColumn.sortBy;
        } else
          sortField =
            constants.fieldNameMaps[orderByField.field] ?? orderByField.field; // translate to fhir field name
        if (sortField) sortDirection = orderField.orderDirection;
      }
    }
    if (!sortField) {
      const returnObj = _getDefaultSortColumn();
      sortField = returnObj
        ? constants.fieldNameMaps[returnObj.field] ?? returnObj.field
        : "_lastUpdated";
      sortDirection = returnObj ? returnObj.defaultSort : "desc";
    }
    if (!sortDirection) {
      sortDirection = "desc";
    }
    return {
      sortField,
      sortDirection,
    };
  };
  const _getSearchString = () => {
    let filterBy = [];
    if (!isEmptyArray(contextState.currentFilters)) {
      contextState.currentFilters.forEach((item) => {
        if (item.value) {
          filterBy.push(
            `${constants.fieldNameMaps[item.field] ?? item.field}${
              constants.defaultSearchableFields.indexOf(
                item.field.toLowerCase()
              ) !== -1
                ? ":contains"
                : ""
            }=${item.value}`
          );
        }
      });
    }
    return filterBy.length ? filterBy.join("&") : "";
  };
  const _getPatientListQueryURL = (query) => {
    const { sortField, sortDirection } = _getSortDirectives(
      query.orderByCollection
    );
    const sortMinus = sortField && sortDirection !== "asc" ? "-" : "";
    const searchString = _getSearchString();
    let apiURL = `/fhir/Patient?_include=Patient:link&_total=accurate&_count=${pagination.pageSize}`;
    if (!isEmptyArray(contextState.patientIdsByCareTeamParticipant)) {
      apiURL += `&_id=${contextState.patientIdsByCareTeamParticipant.join(
        ","
      )}`;
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
  };
  const _getLinksFromResponse = (response) => {
    if (!response) return {};
    let responseSelfLink = !isEmptyArray(response.link)
      ? response.link.filter((item) => {
          return item.relation === "self";
        })
      : null;
    let responseNextLink = !isEmptyArray(response.link)
      ? response.link.filter((item) => {
          return item.relation === "next";
        })
      : null;
    let responsePrevLink = !isEmptyArray(response.link)
      ? response.link.filter((item) => {
          return item.relation === "previous";
        })
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
      previouURL: newPrevURL,
      selfURL: !isEmptyArray(responseSelfLink) ? responseSelfLink[0].url : "",
    };
  };
  const getTableOptions = (theme) => ({
    ...constants.defaultTableOptions,
    headerStyle: {
      backgroundColor: theme.palette.primary.lightest,
      padding: theme.spacing(1, 2, 1),
    },
    rowStyle: (rowData) => ({
      backgroundColor:
        needExternalAPILookup() && _notInPDMP(rowData)
          ? theme.palette.primary.disabled
          : "#FFF",
    }),
    actionsCellStyle: {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
      justifyContent: "center",
    },
    detailPanelType: "single"
  });
  const getTableActions = () => {
    let actions = [];
    if (!shouldHideMoreMenu()) {
      actions = [
        {
          icon: () => <MoreHorizIcon color="primary"></MoreHorizIcon>,
          onClick: (event, rowData) => handleMenuClick(event, rowData),
          tooltip: "More",
        },
      ];
    }
    if (isEmptyArray(appClients)) return actions;
    const appActions = appClients.map((client, index) => {
      return {
        icon: () => (
          <span
            className="action-button"
            key={`actionButton_${index}`}
            style={{
              background: theme.palette.primary.main,
            }}
          >
            {client.label}
          </span>
        ),
        onClick: (event, rowData) => {
          event.stopPropagation();
          const columns = getColumns();
          const hasLastAccessedField =
            columns.filter((column) => column.field === "last_accessed")
              .length > 0;
          // if last accessed field is present
          if (hasLastAccessedField) {
            // this will ensure that last accessed date, i.e. meta.lastUpdated, is being updated
            putPatientData(
              rowData.id,
              rowData.resource,
              (e) => {
                handleErrorCallback(e);
                handleLaunchApp(rowData, client);
              },
              () => handleLaunchApp(rowData, client)
            );
            return;
          }
          handleLaunchApp(rowData, client);
        },
        tooltip: `Launch ${client.id} application for the user`,
      };
    });
    return [...appActions, ...actions];
  };
  const getTableEditableOptions = () => ({
    isDeleteHidden: () => appSettings && !appSettings["ENABLE_PATIENT_DELETE"],
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
            contextStateDispatch({
              data: [...dataDelete],
              errorMessage: "",
            });
          }, 500);
        })
        .catch(() => {
          contextStateDispatch({
            errorMessage: "Unable to remove patient from the list.",
          });
        }),
  });
  const getTableRowEvent = (event, rowData) => {
    event.stopPropagation();
    if (!hasSoFClients()) return;
    handleLaunchApp(rowData);
  };
  const getTableLocalizations = () => ({
    header: {
      actions: "",
    },
    pagination: {
      labelRowsSelect: "rows",
    },
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
  });
  const _getFetchErrorMessage = (e, noData, isExternalLookup) => {
    // error message when no result returned
    const noResultErrorMessage = isExternalLookup
      ? constants.NON_PDMP_RESULT_MESSAGE
      : "Server error occurred. No result returned.  See console for detail.";
    // error message for API error
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
  };
  const _getFHIRPatientData = async (rowData, isExternalLookup) =>
    fetchData(
      _getPatientSearchURL(rowData, {
        searchInactive: !!appSettings["REACTIVATE_PATIENT"],
      }),
      {
        ...constants.searchHeaderParams,
        // external search API allowable method is PUT
        method: isExternalLookup ? "PUT" : "GET",
      },
      (e, status) => {
        const badSearchError =
          status && parseInt(status) > 300 && parseInt(status) < 500;
        const errorMessage = _getFetchErrorMessage(
          e,
          badSearchError ? false : true,
          isExternalLookup
        );
        handleErrorCallback(errorMessage);
        return;
      }
    );
  const handleSearch = (rowData, params) => {
    if (!rowData) {
      handleLaunchError("No patient data to proceed.");
      return false;
    }
    const isReactivate = params && params.reactivate;
    const isCreateNew = params && params.createNew;
    const isExternalLookup = needExternalAPILookup();
    contextStateDispatch({
      currentRow: rowData,
      openLoadingModal: true,
      errorMessage: "",
    });
    _getFHIRPatientData(rowData, isExternalLookup)
      .then((bundleResult) => {
        if (isEmptyArray(bundleResult?.entry)) {
          if (isExternalLookup) {
            _handleRefresh();
            //no result from lookup
            _handleRefresh();
            handleErrorCallback(
              _getFetchErrorMessage(
                "Search returns no match",
                true,
                isExternalLookup
              ),
              {
                openLoadingModal: false,
                currentRow: null,
              }
            );
            return;
          }
        } else {
          const entries = getSortedEntriesFromBundle(bundleResult?.entry);
          const activeEntries = getActiveEntriesFromPatientBundle(entries);
          const inactiveEntries = getInactiveEntriesFromPatientBundle(entries);
          const isInactive = !isEmptyArray(inactiveEntries);
          const shouldShowReactivatePopup =
            isInactive && getAppSettingByKey("REACTIVATE_PATIENT");

          if (activeEntries.length > 1) {
            handleErrorCallback("Multiple matched entries found.", {
              openLoadingModal: false,
              currentRow: null,
            });
            return;
          }
          if (activeEntries.length > 0) {
            const targetEntry = _formatData(activeEntries[0])[0];
            if (!isCreateNew && canLaunchApp()) {
              // found patient, not need to update/create it again
              handleLaunchApp(targetEntry);
              return;
            }
            if (isExternalLookup) {
              //refresh table to show new table row
              _handleRefresh({
                openLoadingModal: false,
                currentRow: null,
              });
              return;
            }
          } else {
            if (!isCreateNew && !isReactivate) {
              if (shouldShowReactivatePopup) {
                contextStateDispatch({
                  openReactivatingModal: true,
                  openLoadingModal: false,
                });
                return;
              }
              if (inactiveEntries.length > 1) {
                handleErrorCallback("Multiple matched entries found.", {
                  openLoadingModal: false,
                  currentRow: null,
                });
                return;
              }
              if (inactiveEntries.length) {
                // found patient, not need to update/create it again
                handleLaunchApp(_formatData(inactiveEntries[0])[0]);
                return;
              }
            }
          }
          const entryToUse = entries.length
            ? entries[0]
            : getFirstResourceFromFhirBundle(bundleResult);
          rowData.resource = {
            ...entryToUse,
          };
          rowData.id = entryToUse.id;
        }
        const oData = new RowData(rowData);
        const payload = JSON.stringify(oData.getFhirData(isCreateNew));
        const isUpdate = isReactivate || (!isCreateNew && !!rowData.id);

        fetchData(
          _getPatientSearchURL(rowData, {
            useActiveFlag: !!getAppSettingByKey("ACTIVE_PATIENT_FLAG"),
            isUpdate: isUpdate,
          }),
          {
            ...constants.searchHeaderParams,
            body: payload,
            method: isUpdate ? "PUT" : "POST",
          },
          (e) => {
            handleErrorCallback(e, {
              openLoadingModal: false,
              currentRow: null,
            });
          }
        )
          .then((result) => {
            const contextParams = {
              openLoadingModal: false,
              currentRow: null,
            };
            let response = getFirstResourceFromFhirBundle(result);
            console.log("Patient update result: ", response);
            if (!response || !response.id) {
              const errorText = getErrorDiagnosticTextFromResponse(response);
              handleErrorCallback(
                _getFetchErrorMessage(errorText, !errorText),
                contextParams
              );
              return false;
            }
            if (canLaunchApp()) {
              handleLaunchApp(_formatData(response)[0]);
              return;
            }
            _handleRefresh(contextParams);
          })
          .catch((e) => {
            //log error to console
            console.log(`Patient search error: ${e}`);
            handleErrorCallback(
              _getFetchErrorMessage(e, false, isExternalLookup),
              {
                openLoadingModal: false,
                currentRow: null,
              }
            );
          });
      })
      .catch((e) => {
        handleErrorCallback(_getFetchErrorMessage(e, false, isExternalLookup), {
          openLoadingModal: false,
          currentRow: null,
        });
        console.log("fetch FHIR patient error ", e);
      });
  };
  const getPatientList = (query) => {
    // console.log("patient list query object ", query);
    const defaults = {
      data: [],
      page: 0,
      totalCount: 0,
    };
    // return patient data
    return new Promise((resolve) => {
      fetchData(
        _getPatientListQueryURL(query),
        constants.noCacheParam,
        function (e) {
          paginationDispatch({ type: "empty" });
          handleErrorCallback(e);
          resolve(defaults);
        }
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
          const { nextURL, previouURL, selfURL } =
            _getLinksFromResponse(response);
          let responsePageoffset = 0;
          if (selfURL) {
            responsePageoffset = getUrlParameter(
              "_getpagesoffset",
              new URL(selfURL)
            );
          }
          let currentPage = responsePageoffset
            ? responsePageoffset / pagination.pageSize
            : 0;
          paginationDispatch({
            payload: {
              nextPageURL: nextURL,
              prevPageURL: previouURL,
              disableNextButton: !nextURL,
              disablePrevButton: pagination.pageNumber === 0,
              totalCount: response.total,
            },
          });
          let patientResources = response.entry.filter(
            (item) => item.resource && item.resource.resourceType === "Patient"
          );
          let responseData = _formatData(patientResources);
          const additionalParams = getAppSettingByKey(
            "FHIR_REST_EXTRA_PARAMS_LIST"
          );
          const eligibleRequests = additionalParams
            ? additionalParams.filter(
                (request) =>
                  typeof request === "string" ||
                  (typeof request === "object" && request.resourceType)
              )
            : [];
          const resolvedData = {
            data: responseData,
            page: currentPage,
            totalCount: response.total,
          };
          if (isEmptyArray(eligibleRequests)) {
            contextStateDispatch({
              data: responseData,
            });
            resolve(resolvedData);
            return;
          }
          // query for additional resources if specified via config
          // gather patient id(s) from API returned result
          const ids = patientResources
            .map((item) => item.resource.id)
            .join(",");
          // FHIR resources request(s)
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
              if (!item.resource["resources"]) item.resource["resources"] = [];
              results.forEach((result) => {
                if (isEmptyArray(result.entry)) return true;
                item.resource["resources"] = [
                  ...item.resource["resources"],
                  ...result.entry
                    .filter((o) => {
                      const matchedResource = additionalParams.filter(
                        (item) =>
                          item.resourceType &&
                          item.resourceType === o.resource.resourceType
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
                          "/"
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
              contextStateDispatch({
                data: resultData,
              });
              resolve({
                data: resultData,
                page: currentPage,
                totalCount: response ? response.total : 0,
              });
            })
            .catch((e) => {
              console.log(e);
              contextStateDispatch({
                data: responseData,
                errorMessage:
                  "Error retrieving additional FHIR resources.  See console for detail.",
              });
              resolve(resolvedData);
            });
        })
        .catch((error) => {
          console.log("Failed to retrieve data", error);
          // set error message or redirect based on error status
          handleErrorCallback(error);
          resolve(defaults);
        });
    });
  };
  const patientListProps = {
    columns: getColumns(),
    errorMessage: contextState.errorMessage,
    filterRowRef: filterRowRef,
    getPatientList: getPatientList,
    isLoading: contextState.openLoadingModal,
    matomoSiteID: appSettings["MATOMO_SITE_ID"],
    onUnload: () => contextStateDispatch({ openLoadingModal: false }),
    searchTitle: appSettings["SEARCH_TITLE_TEXT"],
    tableProps: {
      columns: getColumns(),
      detailPanel: [
        {
          render: (data) => {
            if (shouldHideMoreMenu()) return false;
            if (data.rowData && contextState.currentRow) {
              if (data.rowData.id !== contextState.currentRow.id) {
                return null;
              }
            }
            return <DetailPanel data={data}></DetailPanel>;
          },
          isFreeAction: false,
        },
      ],
      actions: getTableActions(),
      editable: getTableEditableOptions(),
      localization: getTableLocalizations(),
      options: getTableOptions(theme),
      onRowClick: (event, rowData) => {
        getTableRowEvent(event, rowData);
      },
      tableRef: tableRef,
    },
    userName: userName,
  };
  const detailPanelProps = {
    getDetailPanelContent: getDetailPanelContent,
    onDetailPanelClose: onDetailPanelClose,
  };
  const filterRowProps = {
    actionLabel: contextState.actionLabel,
    handleSearch: handleSearch,
    onFiltersDidChange: onFiltersDidChange,
  };
  const launchDialogProps = {
    appClients: appClients,
    handleLaunchApp: (appClient) =>
      handleLaunchApp(contextState.currentRow, appClient),
    onLaunchDialogClose: onLaunchDialogClose,
    open: contextState.openLaunchInfoModal,
    title: `${
      contextState.currentRow
        ? `${contextState.currentRow.last_name}, ${contextState.currentRow.first_name}`
        : ""
    }`,
  };
  const legendProps = {
    shouldShowLegend: shouldShowLegend,
  };
  const menuProps = {
    currentRowId: contextState.currentRow?.id,
    handleMenuClose: handleMenuClose,
    handleMenuSelect: handleMenuSelect,
    menuItems: getMenuItems(),
    open: contextState.openMenu,
    shouldHideMoreMenu: shouldHideMoreMenu,
  };
  const myPatientsProps = {
    enableProviderFilter: getAppSettingByKey("ENABLE_PROVIDER_FILTER"),
    myPatientsFilterLabel: getAppSettingByKey("MY_PATIENTS_FILTER_LABEL"),
    onMyPatientsCheckboxChange: onMyPatientsCheckboxChange,
    userError: userError,
  };
  const paginationProps = {
    disabled: isEmptyArray(contextState.data),
    dispatch: paginationDispatch,
    pagination: pagination,
    tableRef: tableRef.current,
  };
  const reactivateProps = {
    currentRow: contextState.currentRow,
    handleSearch: handleSearch,
    modalOpen: contextState.openReactivatingModal,
    onSubmit: () =>
      contextStateDispatch({
        openReactivatingModal: false,
      }),
    onModalClose: () => {
      if (filterRowRef.current) {
        filterRowRef.current.clear();
      }
    },
    patientLabel: getAppSettingByKey("MY_PATIENTS_FILTER_LABEL"),
  };
  const testPatientProps = {
    enableFilterByTestPatients: getAppSettingByKey(
      "ENABLE_FILTER_FOR_TEST_PATIENTS"
    ),
    filterByTestPatientsLabel: getAppSettingByKey(
      "FILTER_FOR_TEST_PATIENTS_LABEL"
    ),
    onTestPatientsCheckboxChange: onTestPatientsCheckboxChange,
  };
  const childrenProps = {
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
  };
  return (
    <PatientListContext.Provider
      value={{
        // exposed constants
        appSettings,
        childrenProps,
        contextState,
        contextStateDispatch,
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
