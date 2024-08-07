import React, { useContext, useRef } from "react";
import jsonpath from "jsonpath";
import DOMPurify from "dompurify";
import PropTypes from "prop-types";
import { useTheme } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
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
  const { appSettings, hasAppSettings, getAppSettingByKey } = settingsCxt
    ? settingsCxt
    : {};
  const { user, userError } = useUserContext();
  const { userName, roles } = user || {};
  const appClients = getClientsByRequiredRoles(
    appSettings ? appSettings["SOF_CLIENTS"] : null,
    roles
  );
  const tableRef = useRef();
  const filterRowRef = useRef();
  const menuItems = constants.defaultMenuItems;
  const [data, setData] = React.useState([]);
  const [patientIdsByCareTeamParticipant, setPatientIdsByCareTeamParticipant] =
    React.useState(
      hasFlagForCheckbox(constants.FOLLOWING_FLAG)
        ? user && user.followingPatientIds
          ? user.followingPatientIds
          : null
        : null
    );
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
  const [currentFilters, setCurrentFilters] = React.useState(
    constants.defaultFilters
  );
  const [errorMessage, setErrorMessage] = React.useState(
    !appClients || !appClients.length
      ? "No SoF client match the user role(s) found"
      : ""
  );
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
  const [openReactivatingModal, setOpenReactivatingModal] =
    React.useState(false);
  const [openLaunchInfoModal, setOpenLaunchInfoModal] = React.useState(false);
  const [containNoPMPRow, setContainNoPMPRow] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = React.useState("");
  const [currentRow, setCurrentRow] = React.useState(null);
  const [actionLabel, setActionLabel] = React.useState(
    constants.LAUNCH_BUTTON_LABEL
  );
  const [noDataText, setNoDataText] = React.useState("No record found.");
  const [filterByTestPatients, setFilterByTestPatients] = React.useState(false);

  const getColumns = () => {
    const configColumns = getAppSettingByKey("DASHBOARD_COLUMNS");
    const defaultSearchFields = constants.defaultSearchableFields;
    const isValidConfig = configColumns && Array.isArray(configColumns);
    let cols = isValidConfig ? configColumns : constants.defaultColumns;
    if (!isValidConfig) {
      console.log("invalid columns via config. Null or not an array.");
    }
    const hasIdField = cols.filter((col) => col.field === "id").length > 0;
    //columns must include an id field, add if not present
    if (!hasIdField)
      cols.push({
        label: "id",
        hidden: true,
        expr: "$.id",
      });
    let returnColumns = cols.map((column) => {
      const fieldName = column.label.toLowerCase().replace(/\s/g, "_");
      column.title = column.label;
      column.field = fieldName;
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
    if (!columns) return [];
    return columns.filter((column) => column.searchable);
  };
  const shouldSearchByField = (fieldname) => {
    const fields = getSearchableFields();
    return fields.find(
      (col) => String(col.field).toLowerCase() === fieldname && !!col.searchable
    );
  };
  const needExternalAPILookup = () => {
    return getAppSettingByKey("EXTERNAL_FHIR_API");
  };
  const hasSoFClients = () => {
    return appClients && appClients.length > 0;
  };
  const hasMultipleSoFClients = () => {
    return appClients && appClients.length > 1;
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
      setCurrentRow(rowData);
      setOpenLaunchInfoModal(true);
      return;
    }
    let launchURL = _getLaunchURL(rowData.id, launchParams);
    if (!launchURL) {
      handleLaunchError(
        "Unable to launch application. Missing launch URL. Missing configurations."
      );
      return false;
    }
    setOpenLoadingModal(true);
    sessionStorage.clear();
    window.location = launchURL;
  };
  const handleLaunchError = (message) => {
    setErrorMessage(message || "Unable to launch application.");
    toTop();
    return false;
  };
  const onLaunchDialogClose = () => {
    setOpenLaunchInfoModal(false);
  };
  const onFiltersDidChange = (filters) => {
    clearTimeout(filterIntervalId);
    filterIntervalId = setTimeout(function () {
      setErrorMessage("");
      _handleNoDataText(filters);
      _handleActionLabel(filters);
      if (!filters || !filters.length || _containEmptyFilter(filters)) {
        _handleRefresh();
        return filters;
      }
      setCurrentFilters(filters);
      _resetPaging();
      if (tableRef && tableRef.current) tableRef.current.onQueryChange();
      return filters;
    }, 200);
  };
  const _handleActionLabel = (filters) => {
    const totalFilterCount = getSearchableFields().length;
    setActionLabel(
      _getNonEmptyFilters(filters).length === totalFilterCount
        ? constants.CREATE_BUTTON_LABEL
        : constants.LAUNCH_BUTTON_LABEL
    );
  };
  const _handleNoDataText = (filters) => {
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
    setNoDataText(text);
  };
  const handleErrorCallback = (e) => {
    if (e && e.status === 401) {
      setErrorMessage("Unauthorized.");
      window.location = "/logout?unauthorized=true";
      return;
    }
    if (e && e.status === 403) {
      setErrorMessage("Forbidden.");
      window.location = "/logout?forbidden=true";
      return;
    }
    setErrorMessage(
      isString(e)
        ? e
        : e && e.message
        ? e.message
        : "Error occurred processing data"
    );
  };
  const getMenuItems = () => {
    return menuItems && menuItems.length
      ? menuItems.filter((item) => shouldShowMenuItem(item.id))
      : [];
  };
  const handleMenuClick = (event, rowData) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setCurrentRow(rowData);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleMenuSelect = (event) => {
    event.stopPropagation();
    const selectedTarget = event.currentTarget.getAttribute("datatopic");
    if (!selectedTarget) return;
    setSelectedMenuItem(selectedTarget);
    if (!currentRow) return;
    setTimeout(function () {
      currentRow.tableData.showDetailPanel = true;
      handleToggleDetailPanel(currentRow);
    }, 200);
  };
  const getDetailPanelContent = (data) =>
    _getSelectedItemComponent(selectedMenuItem, data.rowData);
  const onDetailPanelClose = (data) => {
    handleToggleDetailPanel(data.rowData);
    handleMenuClose();
  };
  const shouldHideMoreMenu = () => {
    if (!hasAppSettings()) return true;
    return (
      !appSettings[constants.MORE_MENU_KEY] ||
      appSettings[constants.MORE_MENU_KEY].filter((item) => item && item !== "")
        .length === 0
    );
  };
  const shouldShowMenuItem = (id) => {
    let arrMenu = getAppSettingByKey(constants.MORE_MENU_KEY);
    if (!Array.isArray(arrMenu)) return false;
    return (
      arrMenu.filter((item) => item.toLowerCase() === id.toLowerCase()).length >
      0
    );
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
  const onTestPatientsCheckboxChange = (event) => {
    _resetPaging();
    setFilterByTestPatients(event.target.checked);
    if (tableRef.current) tableRef.current.onQueryChange();
  };
  const onMyPatientsCheckboxChange = (event, changeEvent) => {
    _resetPaging();
    if (event && event.target && !event.target.checked) {
      setPatientIdsByCareTeamParticipant(null);
      if (tableRef.current) tableRef.current.onQueryChange();
      if (changeEvent) changeEvent();
      return;
    }
    if (user && user.followingPatientIds) {
      setPatientIdsByCareTeamParticipant(user.followingPatientIds);
      if (tableRef.current) tableRef.current.onQueryChange();
      if (changeEvent) changeEvent();
    }
  };
  const shouldShowLegend = () => containNoPMPRow;
  const _getSelectedItemComponent = (selectedMenuItem, rowData) => {
    let selected = menuItems.filter(
      (item) => item.id.toLowerCase() === selectedMenuItem.toLowerCase()
    );
    if (selected.length) {
      return selected[0].component(rowData);
    }
    return null;
  };
  const _getDefaultSortColumn = () => {
    const cols = getColumns();
    if (!cols) return null;
    const defaultSortFields = cols.filter((column) => column.defaultSort);
    if (defaultSortFields.length) return defaultSortFields[0];
    return null;
  };
  const _resetPaging = () => {
    paginationDispatch({ type: "reset" });
  };
  const _handleRefresh = () => {
    setCurrentFilters(constants.defaultFilters);
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
    if (!data) return false;
    if (!Array.isArray(data)) {
      data = [data];
    }
    return data && Array.isArray(data)
      ? data.map((item) => {
          const source = item.resource ? item.resource : item;
          const cols = getColumns();
          let rowData = {
            id: jsonpath.value(source, "$.id"),
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
            let value =
              nodes && nodes.length ? nodes[nodes.length - 1].value : null;

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
            if (col.field) rowData[col.field] = value;
          });
          return rowData;
        })
      : data;
  };
  const _containEmptyFilter = (filters) =>
    _getNonEmptyFilters(filters).length === 0;
  const _getNonEmptyFilters = (filters) => {
    if (!filters) return [];
    return filters.filter((item) => item.value && item.value !== "");
  };
  const _inPDMP = (rowData) => {
    if (!rowData) return false;
    return (
      rowData.identifier &&
      Array.isArray(rowData.identifier) &&
      rowData.identifier.filter((item) => {
        return item.system === constants.PDMP_SYSTEM_IDENTIFIER && item.value;
      }).length > 0
    );
  };
  const _setNoPMPFlag = (data) => {
    if (!data || !data.length) return false;
    let hasNoPMPRow =
      data.filter((rowData) => {
        return !_inPDMP(rowData);
      }).length > 0;
    //legend will display if contain no pmp row flag is set
    if (hasNoPMPRow) {
      setContainNoPMPRow(true);
    }
  };
  const _getSortDirectives = (orderByCollection) => {
    let sortField = null,
      sortDirection = null;
    if (orderByCollection && orderByCollection.length) {
      const cols = getColumns();
      const orderField = orderByCollection[0];
      const orderByField = cols[orderField.orderBy]; // orderBy is the index of the column
      if (orderByField) {
        const matchedColumn = cols.filter(
          (col) => col.field === orderByField.field
        );
        if (matchedColumn.length && matchedColumn[0].sortBy) {
          sortField = matchedColumn[0].sortBy;
        } else sortField = constants.fieldNameMaps[orderByField.field]; // translate to fhir field name
        if (sortField) sortDirection = orderField.orderDirection;
      }
    }
    if (!sortField) {
      const returnObj = _getDefaultSortColumn();
      sortField = returnObj
        ? constants.fieldNameMaps[returnObj.field]
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
    if (currentFilters && currentFilters.length) {
      currentFilters.forEach((item) => {
        if (item.value) {
          filterBy.push(
            `${constants.fieldNameMaps[item.field]}${
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
    if (
      patientIdsByCareTeamParticipant &&
      patientIdsByCareTeamParticipant.length
    ) {
      apiURL += `&_id=${patientIdsByCareTeamParticipant.join(",")}`;
    }
    if (getAppSettingByKey("ENABLE_FILTER_FOR_TEST_PATIENTS")) {
      if (!filterByTestPatients) {
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
    let responseSelfLink = response.link
      ? response.link.filter((item) => {
          return item.relation === "self";
        })
      : 0;
    let responseNextLink = response.link
      ? response.link.filter((item) => {
          return item.relation === "next";
        })
      : 0;
    let responsePrevLink = response.link
      ? response.link.filter((item) => {
          return item.relation === "previous";
        })
      : 0;
    let hasSelfLink = responseSelfLink && responseSelfLink.length;
    let hasNextLink = responseNextLink && responseNextLink.length;
    let hasPrevLink = responsePrevLink && responsePrevLink.length;
    let newNextURL = hasNextLink ? responseNextLink[0].url : "";
    let newPrevURL = hasPrevLink
      ? responsePrevLink[0].url
      : hasSelfLink
      ? responseSelfLink[0].url
      : "";
    return {
      nextURL: newNextURL,
      previouURL: newPrevURL,
      selfURL:
        responseSelfLink && responseSelfLink.length
          ? responseSelfLink[0].url
          : "",
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
        needExternalAPILookup() && !_inPDMP(rowData)
          ? theme.palette.primary.disabled
          : "#FFF",
    }),
    actionsCellStyle: {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
      justifyContent: "center",
    },
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
    if (!appClients || !appClients.length) return actions;
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
              handleErrorCallback,
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
            const dataDelete = [...data];
            const target = dataDelete.find((el) => el.id === oldData.id);
            const index = dataDelete.indexOf(target);
            dataDelete.splice(index, 1);
            setData([...dataDelete]);
            setErrorMessage("");
          }, 500);
        })
        .catch(() => {
          setErrorMessage("Unable to remove patient from the list.");
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
            __html: DOMPurify.sanitize(noDataText),
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
        console.log("Error status? ", status);
        const badSearchError =
          status && parseInt(status) > 300 && parseInt(status) < 500;
        const errorMessage = badSearchError
          ? _getFetchErrorMessage(e, true, isExternalLookup)
          : _getFetchErrorMessage(e, false, isExternalLookup);
        handleErrorCallback(errorMessage);
        return;
      }
    );
  const handleSearch = (rowData, params) => {
    if (!rowData) {
      handleLaunchError("No patient data to proceed.");
      return false;
    }
    setCurrentRow(rowData);
    const isReactivate = params && params.reactivate;
    const isCreateNew = params && params.createNew;
    const isExternalLookup = needExternalAPILookup();
    setOpenLoadingModal(true);
    _getFHIRPatientData(rowData, isExternalLookup)
      .then((bundleResult) => {
        setErrorMessage("");
        if (isEmptyArray(bundleResult?.entry)) {
          if (isExternalLookup) {
            _handleRefresh();
            setOpenLoadingModal(false);
            //no result from lookup
            handleErrorCallback(
              _getFetchErrorMessage("Search returns no match", true, isExternalLookup)
            );
            return;
          }
        } else {
          const entries = getSortedEntriesFromBundle(bundleResult?.entry);
          const activeEntries = getActiveEntriesFromPatientBundle(entries);
          const inactiveEntries = getInactiveEntriesFromPatientBundle(entries);
          const isInactive = inactiveEntries.length > 0;
          const shouldShowReactivatePopup =
            isInactive && getAppSettingByKey("REACTIVATE_PATIENT");

          if (activeEntries.length > 1) {
            setOpenLoadingModal(false);
            handleErrorCallback("Multiple matched entries found.");
            return;
          }
          if (activeEntries.length > 0) {
            const targetEntry = _formatData(activeEntries[0])[0];
            if (!isCreateNew && canLaunchApp()) {
              setOpenLoadingModal(false);
              // found patient, not need to update/create it again
              handleLaunchApp(targetEntry);
              return;
            }
            if (isExternalLookup) {
              //refresh table to show new table row
              _handleRefresh();
              setOpenLoadingModal(false);
              return;
            }
          } else {
            if (!isCreateNew && !isReactivate) {
              if (shouldShowReactivatePopup) {
                setOpenReactivatingModal(true);
                setOpenLoadingModal(false);
                return;
              }
              if (inactiveEntries.length > 1) {
                handleErrorCallback("Multiple matched entries found.");
                setOpenLoadingModal(false);
                return;
              }
              if (inactiveEntries.length) {
                setOpenLoadingModal(false);
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
            setOpenLoadingModal(false);
            handleErrorCallback(e);
          }
        )
          .then((result) => {
            setOpenLoadingModal(false);
            let response = getFirstResourceFromFhirBundle(result);
            console.log("Patient update result: ", response);
            if (!response || !response.id) {
              const errorText = getErrorDiagnosticTextFromResponse(response);
              handleLaunchError(_getFetchErrorMessage(errorText, !errorText));
              return false;
            }
            try {
              // show new patient row by refreshing table
              _handleRefresh();
            } catch (e) {
              console.log("Error occurred adding row to table ", e);
            }
            if (canLaunchApp()) {
              handleLaunchApp(_formatData(response)[0]);
            }
          })
          .catch((e) => {
            //log error to console
            console.log(`Patient search error: ${e}`);
            setOpenLoadingModal(false);
            handleLaunchError(_getFetchErrorMessage(e, false, isExternalLookup));
          });
      })
      .catch((e) => {
        setOpenLoadingModal(false);
        handleErrorCallback(_getFetchErrorMessage(e, false, isExternalLookup));
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
          if (!response || !response.entry || !response.entry.length) {
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
          let responseData = _formatData(patientResources) || [];
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
            setData(responseData);
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
              setData(resultData || []);
              resolve({
                data: resultData,
                page: currentPage,
                totalCount: response ? response.total : 0,
              });
            })
            .catch((e) => {
              setErrorMessage(
                "Error retrieving additional FHIR resources.  See console for detail."
              );
              console.log(e);
              setData(responseData);
              resolve(resolvedData);
            });
        })
        .catch((error) => {
          console.log("Failed to retrieve data", error);
          //unauthorized error
          handleErrorCallback(error);
          setErrorMessage(
            `Error retrieving data: ${
              typeof error === "string"
                ? error
                : error && error.status
                ? "Error status " + error.status
                : error
            }`
          );
          resolve(defaults);
        });
    });
  };
  return (
    <PatientListContext.Provider
      value={{
        // exposed constants
        appClients,
        appSettings,
        menuItems,
        user,
        userName,
        userError,
        tableRef,
        filterRowRef,
        // table props
        tableProps: {
          columns: getColumns(),
          detailPanel: [
            {
              render: (data) => {
                if (shouldHideMoreMenu()) return false;
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
        // exposed methods
        handleErrorCallback,
        handleLaunchApp,
        handleLaunchError,
        handleMenuClose,
        handleMenuSelect,
        handleSearch,
        hasMultipleSoFClients,
        hasSoFClients,
        getAppSettingByKey,
        getColumns,
        getDetailPanelContent,
        getPatientList,
        getSearchableFields,
        shouldSearchByField,
        getMenuItems,
        needExternalAPILookup,
        onDetailPanelClose,
        onFiltersDidChange,
        onLaunchDialogClose,
        onMyPatientsCheckboxChange,
        onTestPatientsCheckboxChange,
        shouldShowLegend,
        shouldHideMoreMenu,
        shouldShowMenuItem,
        // exposed states/set state methods
        actionLabel,
        anchorEl,
        currentRow,
        data,
        errorMessage,
        openLoadingModal,
        setOpenLoadingModal,
        openReactivatingModal,
        setOpenReactivatingModal,
        openLaunchInfoModal,
        pagination,
        paginationDispatch,
        patientIdsByCareTeamParticipant,
        setPatientIdsByCareTeamParticipant,
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
