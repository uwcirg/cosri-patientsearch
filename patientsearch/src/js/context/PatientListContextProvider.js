import React, { useContext, lazy, Suspense } from "react";
import jsonpath from "jsonpath";
import DOMPurify from "dompurify";
import PropTypes from "prop-types";
import CircularProgress from "@material-ui/core/CircularProgress";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import useStyles from "../../styles/patientListStyle";
import { useSettingContext } from "./SettingContextProvider";
import { useUserContext } from "./UserContextProvider";
import * as constants from "../constants/consts";
import {
  fetchData,
  getAppLaunchURL,
  getLocalDateTimeString,
  getClientsByRequiredRoles,
  getTimeAgoDisplay,
  isString,
  putPatientData,
  getUrlParameter,
  isEmptyArray,
  toTop,
} from "../helpers/utility";
const PatientListContext = React.createContext({});
/*
 * context provider component that allows patient list settings to be accessible to its children component(s)
 */
let filterIntervalId = 0;
export default function PatientListContextProvider({ children }) {
  const settingsCxt = useSettingContext();
  const appSettings = settingsCxt ? settingsCxt.appSettings : {};
  const { user, userError } = useUserContext();
  const { userName, roles } = user || {};
  const appClients = getClientsByRequiredRoles(
    appSettings ? appSettings["SOF_CLIENTS"] : null,
    roles
  );
  const classes = useStyles();
  const tableRef = React.useRef();
  const UrineScreenComponent = lazy(() => import("../components/UrineScreen"));
  const AgreementComponent = lazy(() => import("../components/Agreement"));
  const menuItems = [
    {
      text: "Add Urine Tox Screen",
      id: "UDS",
      component: (rowData) => (
        <Suspense fallback={<div>Loading...</div>}>
          <UrineScreenComponent rowData={rowData}></UrineScreenComponent>
        </Suspense>
      ),
    },
    {
      text: "Add Controlled Substance Agreement",
      id: "CS_agreement",
      component: (rowData) => (
        <Suspense fallback={<div>Loading...</div>}>
          <AgreementComponent rowData={rowData}></AgreementComponent>
        </Suspense>
      ),
    },
  ];
  const [data, setData] = React.useState([]);
  const [patientIdsByCareTeamParticipant, setPatientIdsByCareTeamParticipant] =
    React.useState(false);
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
  const errorStyle = { display: errorMessage ? "block" : "none" };
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
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

  const hasAppSettings = () =>
    appSettings && Object.keys(appSettings).length > 0;
  const getAppSettingByKey = (key) => {
    if (!hasAppSettings()) return "";
    return appSettings[key];
  };
  const existsIndata = (rowData) => {
    if (!data || !rowData) return false;
    return (
      data.filter((item) => {
        return parseInt(item.id) === parseInt(rowData.id);
      }).length > 0
    );
  };
  const _addDataRow = (rowData) => {
    if (!rowData || !rowData.id) return false;
    let newData = _formatData(rowData);
    if (newData && !existsIndata(newData[0])) {
      setData([newData[0], ...data]);
    }
  };
  const getColumns = () => {
    const configColumns = getAppSettingByKey("DASHBOARD_COLUMNS");
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
    return cols.map((column) => {
      const fieldName = column.label.toLowerCase().replace(/\s/g, "_");
      column.title = column.label;
      column.field = fieldName;
      /* eslint-disable react/no-unknown-property */
      column.emptyValue = () => <div datacolumn={`${column.label}`}>--</div>;
      column.render = (rowData) => (
        /* eslint-disable react/no-unknown-property */
        <div datacolumn={`${column.label}`}>{rowData[fieldName]}</div>
      );
      return column;
    });
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
  const handleLaunchApp = (rowData, launchParams) => {
    if (!launchParams) {
      // if only one SoF client, use its launch params
      launchParams =
        hasSoFClients() && appClients.length === 1 ? appClients[0] : null;
    }
    // if no launch params specifieid, need to handle multiple SoF clients that can be launched
    // open a dialog here so user can select which one to launch?
    if (!launchParams && hasMultipleSoFClients()) {
      setCurrentRow(rowData);
      setOpenLoadingModal(false);
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
    setOpenLoadingModal(false);
    toTop();
    return false;
  };
  const onLaunchDialogClose = () => {
    setOpenLaunchInfoModal(false);
    _handleRefresh();
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
    setActionLabel(
      _getNonEmptyFilters(filters).length === 3
        ? constants.CREATE_BUTTON_LABEL
        : constants.LAUNCH_BUTTON_LABEL
    );
  };
  const _handleNoDataText = (filters) => {
    let text = "No matching record found.<br/>";
    const nonEmptyFilters = _getNonEmptyFilters(filters);
    if (nonEmptyFilters.length < 3) {
      text += "Try entering all First name, Last name and Birth Date.";
    } else if (nonEmptyFilters.length === 3) {
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
    const selectedTarget = event.target.getAttribute("datatopic");
    setSelectedMenuItem(selectedTarget);
    if (!selectedTarget) {
      handleMenuClose();
      return;
    }
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
    setFilterByTestPatients(event.target.checked);
    if (tableRef.current) tableRef.current.onQueryChange();
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
  const _getPatientSearchURL = (data) => {
    if (needExternalAPILookup()) {
      const dataURL = "/external_search/Patient";
      // remove leading/trailing spaces from first/last name data sent to patient search API
      const params = [
        `subject:Patient.name.given=${String(data.first_name).trim()}`,
        `subject:Patient.name.family=${String(data.last_name).trim()}`,
        `subject:Patient.birthdate=eq${data.birth_date}`,
      ];
      return `${dataURL}?${params.join("&")}`;
    }
    return `/fhir/Patient?given=${String(
      data.first_name
    ).trim()}&family=${String(data.last_name).trim()}&birthdate=${
      data.birth_date
    }`;
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
            if (col.field)
              rowData[col.field] = value;
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
        return (
          item.system === "https://github.com/uwcirg/script-fhir-facade" &&
          item.value
        );
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
  const getTableOptions = (theme) => ({
    paginationTypestepped: "stepped",
    showFirstLastPageButtons: false,
    paging: false,
    padding: "dense",
    emptyRowsWhenPaging: false,
    debounceInterval: 300,
    detailPanelColumnAlignment: "right",
    toolbar: false,
    filtering: false,
    maxColumnSort: 1,
    thirdSortClick: false,
    search: false,
    showTitle: false,
    actionsColumnIndex: -1,
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
          icon: () => (
            <MoreHorizIcon
              color="primary"
              className={classes.moreIcon}
            ></MoreHorizIcon>
          ),
          onClick: (event, rowData) => handleMenuClick(event, rowData),
          tooltip: "More",
        },
      ];
    }
    if (!appClients || !appClients.length) return actions;
    const appActions = appClients.map((client, index) => {
      return {
        icon: () => (
          <span className={classes.button} key={`actionButton_${index}`}>
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
        deleteText:
          "Are you sure you want to remove this patient from the list? (You can add them back later by searching for them)",
        saveTooltip: "OK",
      },
      emptyDataSourceMessage: (
        <div
          id="emptyDataContainer"
          className={`${classes.flex} ${classes.warning}`}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(noDataText),
          }}
        ></div>
      ),
    },
  });
  const handleSearch = (rowData) => {
    if (!rowData) {
      handleLaunchError("No patient data to proceed.");
      return false;
    }
    // search parameters
    const searchBody = rowData.resource
      ? JSON.stringify(rowData.resource)
      : JSON.stringify({
          resourceType: "Patient",
          name: [
            {
              family: rowData.last_name.trim(),
              given: [rowData.first_name.trim()],
            },
          ],
          birthDate: rowData.birth_date,
        });
    // error message when no result returned
    const noResultErrorMessage = needExternalAPILookup()
      ? "<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>"
      : "No matched patient found";
    // error message for API error
    const fetchErrorMessage = needExternalAPILookup()
      ? "<p>COSRI is unable to return PMP information. This may be due to PMP system being down or a problem with the COSRI connection to PMP.</p>"
      : "Server error when looking up patient";
    setOpenLoadingModal(true);
    fetchData(
      _getPatientSearchURL(rowData),
      {
        ...{
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: searchBody,
        },
        ...constants.noCacheParam,
      },
      (e) => handleErrorCallback(e)
    )
      .then((result) => {
        let response = result;
        if (result && result.entry && result.entry[0]) {
          response = result.entry[0];
        }
        if (!response || !response.id) {
          handleLaunchError(noResultErrorMessage);
          _handleRefresh();
          return false;
        }
        //add new table row where applicable
        try {
          _addDataRow(response);
        } catch (e) {
          console.log("Error occurred adding row to table ", e);
        }
        const shouldLaunchApp =
          appClients &&
          appClients.length > 0 &&
          (appClients.length === 1 ||
            (hasMultipleSoFClients() &&
              getAppSettingByKey("LAUNCH_AFTER_PATIENT_CREATION")));
        
        if (shouldLaunchApp()) {
          // use config variable to determine whether to launch the first defined client application after account creation
          handleLaunchApp(
            _formatData(response)[0],
            appClients[0]
          );
        } else {
            _handleRefresh();
        }
      })
      .catch((e) => {
        //log error to console
        console.log(`Patient search error: ${e}`);
        handleLaunchError(fetchErrorMessage + `<p>See console for detail.</p>`);
      });
  };
  const getPatientList = (query) => {
    console.log("patient list query object ", query);
    let sortField = null,
      sortDirection = null;
    if (query.orderByCollection && query.orderByCollection.length) {
      const orderField = query.orderByCollection[0];
      const cols = getColumns();
      const orderByField = cols[orderField.orderBy]; // orderBy is the index of the column
      if (orderByField) {
        const matchedColumn = cols.filter(
          (col) => col.field === orderByField.field
        );
        if (matchedColumn.length && matchedColumn[0].sortBy) {
          sortField = matchedColumn[0].sortBy;
        } else sortField = constants.fieldNameMaps[orderByField.field]; // translate to fhir field name
      }
      sortDirection = orderField.orderDirection;
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
    let sortMinus = sortField && sortDirection !== "asc" ? "-" : "";
    let filterBy = [];

    if (currentFilters && currentFilters.length) {
      currentFilters.forEach((item) => {
        if (item.value) {
          filterBy.push(
            `${constants.fieldNameMaps[item.field]}:contains=${item.value}`
          );
        }
      });
    }
    let searchString = filterBy.length ? filterBy.join("&") : "";
    let defaults = {
      data: [],
      page: 0,
      totalCount: 0,
    };
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
    // return patient data
    return new Promise((resolve) => {
      fetchData(apiURL, constants.noCacheParam, function (e) {
        paginationDispatch({ type: "empty" });
        handleErrorCallback(e);
        resolve(defaults);
      })
        .then((response) => {
          if (!response || !response.entry || !response.entry.length) {
            paginationDispatch({ type: "empty" });
            resolve(defaults);
            return;
          }
          if (needExternalAPILookup()) {
            _setNoPMPFlag(response.entry);
          }
          let responsePageoffset = 0;
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
          if (hasSelfLink) {
            responsePageoffset = getUrlParameter(
              "_getpagesoffset",
              new URL(responseSelfLink[0].url)
            );
          }
          let currentPage = responsePageoffset
            ? responsePageoffset / pagination.pageSize
            : 0;
          let hasNextLink = responseNextLink && responseNextLink.length;
          let hasPrevLink = responsePrevLink && responsePrevLink.length;
          let newNextURL = hasNextLink ? responseNextLink[0].url : "";
          let newPrevURL = hasPrevLink
            ? responsePrevLink[0].url
            : hasSelfLink
            ? responseSelfLink[0].url
            : "";
          paginationDispatch({
            payload: {
              nextPageURL: newNextURL,
              prevPageURL: newPrevURL,
              disableNextButton: !hasNextLink,
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
          const queryResults = (async () => {
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
          queryResults
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
              error && error.status ? "Error status " + error.status : error
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
        errorStyle,
        menuItems,
        user,
        userName,
        userError,
        tableRef,
        // exposed methods
        handleErrorCallback,
        handleLaunchApp,
        handleLaunchError,
        handleMenuClick,
        handleMenuClose,
        handleMenuSelect,
        handleSearch,
        handleToggleDetailPanel,
        hasMultipleSoFClients,
        hasSoFClients,
        getAppSettingByKey,
        getColumns,
        getDetailPanelContent,
        getPatientList,
        getMenuItems,
        getTableActions,
        getTableRowEvent,
        getTableEditableOptions,
        getTableLocalizations,
        getTableOptions,
        needExternalAPILookup,
        onDetailPanelClose,
        onFiltersDidChange,
        onLaunchDialogClose,
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
        filterByTestPatients,
        setFilterByTestPatients,
        openLoadingModal,
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