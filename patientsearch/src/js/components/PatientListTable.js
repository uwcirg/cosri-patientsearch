import React, { lazy, Suspense } from "react";
import DOMPurify from "dompurify";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import jsonpath from "jsonpath";
import MaterialTable from "@material-table/core";
import RefreshIcon from "@material-ui/icons/Refresh";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import CircularProgress from "@material-ui/core/CircularProgress";
import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container";
import TablePagination from "@material-ui/core/TablePagination";
import Tooltip from "@material-ui/core/Tooltip";
import DetailPanel from "./DetailPanel";
import DialogBox from "./DialogBox";
import Dropdown from "./Dropdown";
import Error from "./Error";
import FilterRow from "./FilterRow";
import LoadingModal from "./LoadingModal";
import MyPatientsCheckbox from "./MyPatientsCheckbox";
import OverlayElement from "./OverlayElement";
import { useUserContext } from "../context/UserContextProvider";
import { useSettingContext } from "../context/SettingContextProvider";
import * as constants from "../constants/consts";
import {
  addMamotoTracking,
  fetchData,
  getAppLaunchURL,
  getLocalDateTimeString,
  getUrlParameter,
  getClientsByRequiredRoles,
  getTimeAgoDisplay,
  isEmptyArray,
  isString,
  putPatientData,
} from "../helpers/utility";
const useStyles = makeStyles((theme) => ({
  container: {
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: theme.spacing(2),
    marginTop: 148,
  },
  filterTable: {
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(20),
    ["@media (min-width:639px)"]: {
      marginTop: 0,
    },
  },
  table: {
    minWidth: 320,
    maxWidth: "100%",
  },
  detailPanelCloseButton: {
    position: "absolute",
    top: theme.spacing(1.5),
    right: theme.spacing(6),
    color: theme.palette.primary.main,
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(4, 4, 4),
    border: 0,
    minWidth: "250px",
  },
  flex: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  flexButton: {
    marginRight: theme.spacing(1),
  },
  label: {
    marginRight: theme.spacing(1.5),
  },
  button: {
    background: theme.palette.primary.main,
    padding: theme.spacing(1, 2, 1),
    color: "#FFF",
    fontSize: "12px",
    borderRadius: "4px",
    fontWeight: 600,
    textTransform: "uppercase",
    border: 0,
  },
  warning: {
    color: theme.palette.primary.warning,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    lineHeight: 1.7,
  },
  legend: {
    marginTop: theme.spacing(2.5),
  },
  pagination: {
    marginTop: theme.spacing(1),
    display: "inline-block",
    border: "2px solid #ececec",
  },
  legendIcon: {
    backgroundColor: theme.palette.primary.disabled,
    width: theme.spacing(6),
    height: theme.spacing(3),
    marginRight: theme.spacing(0.5),
    display: "inline-block",
    verticalAlign: "bottom",
  },
  flexContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  refreshButtonContainer: {
    display: "inline-block",
    verticalAlign: "top",
    marginTop: theme.spacing(2.5),
    marginRight: theme.spacing(2),
  },
  spacer: {
    minWidth: "20px",
    minHeight: "20px",
  },
  moreIcon: {
    marginRight: theme.spacing(1),
  },
}));
let filterIntervalId = 0;
export default function PatientListTable() {
  const theme = useTheme();
  const classes = useStyles();
  const appSettings = useSettingContext().appSettings;
  const { user } = useUserContext();
  const [appClients, setAppClients] = React.useState(null);
  const [data, setData] = React.useState([]);
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
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
  const [openLaunchInfoModal, setOpenLaunchInfoModal] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [containNoPMPRow, setContainNoPMPRow] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = React.useState("");
  const [currentRow, setCurrentRow] = React.useState(null);
  const [actionLabel, setActionLabel] = React.useState(
    constants.LAUNCH_BUTTON_LABEL
  );
  const [noDataText, setNoDataText] = React.useState("No record found.");
  const [filterPatientsByProvider, setFilterPatientsByProvider] =
    React.useState(false);
  const tableRef = React.useRef();
  const UrineScreenComponent = lazy(() => import("./UrineScreen"));
  const AgreementComponent = lazy(() => import("./Agreement"));
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
  const errorStyle = { display: errorMessage ? "block" : "none" };
  const toTop = () => {
    window.scrollTo(0, 0);
  };
  const hasAppSettings = () =>
    appSettings && Object.keys(appSettings).length > 0;
  const getAppSettingByKey = (key) => {
    if (!hasAppSettings()) return "";
    return appSettings[key];
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
      column.emptyValue = () => <div dataColumn={`${column.label}`}>--</div>;
      column.render = (rowData) => (
        /* eslint-disable react/no-unknown-property */
        <div dataColumn={`${column.label}`}>{rowData[fieldName]}</div>
      );
      return column;
    });
  };
  const existsIndata = (rowData) => {
    if (!data || !rowData) return false;
    return (
      data.filter((item) => {
        return parseInt(item.id) === parseInt(rowData.id);
      }).length > 0
    );
  };
  const addDataRow = (rowData) => {
    if (!rowData || !rowData.id) return false;
    let newData = formatData(rowData);
    if (newData && !existsIndata(newData[0])) {
      setData([newData[0], ...data]);
    }
  };
  const needExternalAPILookup = () => {
    return getAppSettingByKey("EXTERNAL_FHIR_API");
  };
  const getPatientSearchURL = (data) => {
    if (needExternalAPILookup()) {
      const dataURL = "/external_search/Patient";
      const params = [
        `subject:Patient.name.given=${data.first_name}`,
        `subject:Patient.name.family=${data.last_name}`,
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
  const getLaunchURL = (patientId, launchParams) => {
    if (!patientId) {
      console.log("Missing information: patient Id");
      return "";
    }
    launchParams = launchParams || {};
    return getAppLaunchURL(patientId, launchParams["launch_url"], appSettings);
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

    let launchURL = getLaunchURL(rowData.id, launchParams);
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
    handleRefresh();
  };
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
      getPatientSearchURL(rowData),
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
          handleRefresh();
          return false;
        }
        //add new table row where applicable
        try {
          addDataRow(response);
        } catch (e) {
          console.log("Error occurred adding row to table ", e);
        }
        handleRefresh();
        // by default launch the first defined client application after account creation
        // TODO use config variable? to enable / disable certain SoF clients dependent on FHIR state.
        handleLaunchApp(formatData(response)[0], appClients && appClients.length ? appClients[0] : null);
      })
      .catch((e) => {
        //log error to console
        console.log(`Patient search error: ${e}`);
        handleLaunchError(fetchErrorMessage + `<p>See console for detail.</p>`);
      });
  };
  const formatData = (data) => {
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
            let nodes = jsonpath.nodes(source, col.expr);
            let value = nodes && nodes.length ? nodes[nodes.length-1].value : null;
            if (dataType === "date") {
              value = getLocalDateTimeString(value);
            }
            if (dataType === "timeago" && value) {
              value = getTimeAgoDisplay(new Date(value));
            }
            rowData[col.field] = value;
          });
          return rowData;
        })
      : data;
  };

  const inPDMP = (rowData) => {
    if (!rowData) return false;
    return (
      rowData.identifier &&
      rowData.identifier.filter((item) => {
        return (
          item.system === "https://github.com/uwcirg/script-fhir-facade" &&
          item.value
        );
      }).length > 0
    );
  };
  const setNoPMPFlag = (data) => {
    if (!data || !data.length) return false;
    let hasNoPMPRow =
      data.filter((rowData) => {
        return !inPDMP(rowData);
      }).length > 0;
    //legend will display if contain no pmp row flag is set
    if (hasNoPMPRow) {
      setContainNoPMPRow(true);
    }
  };
  const containEmptyFilter = (filters) =>
    getNonEmptyFilters(filters).length === 0;
  const getNonEmptyFilters = (filters) => {
    if (!filters) return [];
    return filters.filter((item) => item.value && item.value !== "");
  };
  const handleActionLabel = (filters) => {
    setActionLabel(
      getNonEmptyFilters(filters).length === 3
        ? constants.CREATE_BUTTON_LABEL
        : constants.LAUNCH_BUTTON_LABEL
    );
  };
  const handleNoDataText = (filters) => {
    let text = "No matching record found.<br/>";
    const nonEmptyFilters = getNonEmptyFilters(filters);
    if (nonEmptyFilters.length < 3) {
      text += "Try entering all First name, Last name and Birth Date.";
    } else if (nonEmptyFilters.length === 3) {
      text += `Click on ${constants.CREATE_BUTTON_LABEL} button to create new patient`;
    }
    setNoDataText(text);
  };
  const onFiltersDidChange = (filters) => {
    clearTimeout(filterIntervalId);
    filterIntervalId = setTimeout(function () {
      setErrorMessage("");
      handleNoDataText(filters);
      handleActionLabel(filters);
      if (!filters || !filters.length || containEmptyFilter(filters)) {
        handleRefresh();
        return filters;
      }
      setCurrentFilters(filters);
      resetPaging();
      if (tableRef && tableRef.current) tableRef.current.onQueryChange();
      return filters;
    }, 200);
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
  const resetPaging = () => {
    paginationDispatch({ type: "reset" });
  };
  const handleChangePage = (event, newPage) => {
    paginationDispatch({
      payload: {
        prevPageNumber: pagination.pageNumber,
        pageNumber: newPage,
      },
    });
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };

  const handleChangeRowsPerPage = (event) => {
    paginationDispatch({
      payload: {
        pageSize: parseInt(event.target.value, 10),
        nextPageURL: "",
        prevPageURL: "",
        pageNumber: 0,
      },
    });
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };
  const handleRefresh = () => {
    setCurrentFilters(constants.defaultFilters);
    resetPaging();
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
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
  const getSelectedItemComponent = (selectedMenuItem, rowData) => {
    let selected = menuItems.filter(
      (item) => item.id.toLowerCase() === selectedMenuItem.toLowerCase()
    );
    if (selected.length) {
      return selected[0].component(rowData);
    }
    return null;
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
  const getDefaultSortColumn = () => {
    const cols = getColumns();
    if (!cols) return null;
    const defaultSortFields = cols.filter((column) => column.defaultSort);
    if (defaultSortFields.length) return defaultSortFields[0];
    return null;
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
      const returnObj = getDefaultSortColumn();
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
    if (filterPatientsByProvider) {
      apiURL += `&general-practitioner=${user.practitionerId||"-1"}`;
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

    /*
     * get patient list
     */
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
            setNoPMPFlag(response.entry);
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

          let responseData = formatData(patientResources) || [];

          const additionalParams = getAppSettingByKey(
            "FHIR_REST_EXTRA_PARAMS_LIST"
          );
          const eligibleRequests = additionalParams.filter(
            (request) =>
              typeof request === "string" ||
              (typeof request === "object" && request.resourceType)
          );
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
              const resultData = formatData(data);
              setData(resultData || []);
              resolve({
                data: resultData,
                page: currentPage,
                totalCount: response.total,
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

  const handlePageUnload = () => {
    setTimeout(() => setOpenLoadingModal(false), 500);
  };

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

  const getTableOptions = () => ({
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
        needExternalAPILookup() && !inPDMP(rowData)
          ? theme.palette.primary.disabled
          : "#FFF",
    }),
    actionsCellStyle: {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
      justifyContent: "center",
    },
  });

  const getTableEditableOptions = () => ({
    isDeleteHidden: () => !appSettings["ENABLE_PATIENT_DELETE"],
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

  const renderSearchTitle = () => {
    const title = appSettings["SEARCH_TITLE_TEXT"] ? appSettings["SEARCH_TITLE_TEXT"] : null;
    if (!title) return false;
    return <h2>{title}</h2>;
  };

  const renderPatientSearchRow = () => (
    <table className={classes.filterTable}>
      <tbody>
        <FilterRow
          onFiltersDidChange={onFiltersDidChange}
          launchFunc={handleSearch}
          launchButtonLabel={actionLabel}
        />
      </tbody>
    </table>
  );

  const renderLegend = () => {
    if (containNoPMPRow)
      return (
        <div className={classes.legend}>
          <span className={classes.legendIcon}></span> Not in PMP
        </div>
      );
    return <div className={classes.spacer}></div>;
  };

  const renderRefreshButton = () => (
    <div className={classes.refreshButtonContainer}>
      <Tooltip title="Refresh the list">
        <Button
          variant="contained"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => {
            location.reload();
          }}
        >
          Refresh
        </Button>
      </Tooltip>
    </div>
  );

  const renderTablePagination = () => (
    <TablePagination
      id="patientListPagination"
      className={`${
        pagination.totalCount === 0 ? "ghost" : classes.pagination
      }`}
      rowsPerPageOptions={[5, 10, 20, 50]}
      onPageChange={handleChangePage}
      page={pagination.pageNumber}
      rowsPerPage={pagination.pageSize}
      onRowsPerPageChange={handleChangeRowsPerPage}
      count={pagination.totalCount}
      size="small"
      component="div"
      nextIconButtonProps={{
        disabled: pagination.disableNextButton,
        color: "primary",
      }}
      backIconButtonProps={{
        disabled: pagination.disablePrevButton,
        color: "primary",
      }}
      SelectProps={{ variant: "outlined" }}
    />
  );

  const renderLaunchDialog = () => (
    <DialogBox
      open={openLaunchInfoModal}
      onClose={() => onLaunchDialogClose()}
      title={
        currentRow ? `${currentRow.last_name}, ${currentRow.first_name}` : ""
      }
      body={
        <div className={classes.flex}>
          {hasSoFClients() &&
            appClients.map((appClient, index) => {
              return (
                <Button
                  key={`launchButton_${index}`}
                  color="primary"
                  variant="contained"
                  className={classes.flexButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchApp(currentRow, appClient);
                  }}
                >{`Launch ${appClient.id}`}</Button>
              );
            })}
        </div>
      }
    ></DialogBox>
  );

  const renderDropdownMenu = () => {
    if (shouldHideMoreMenu()) return false;
    return (
      <Dropdown
        anchorEl={anchorEl}
        handleMenuClose={handleMenuClose}
        handleMenuSelect={handleMenuSelect}
        menuItems={menuItems.filter((item) => shouldShowMenuItem(item.id))}
      ></Dropdown>
    );
  };

  const renderDetailedPanel = (data) => {
    if (shouldHideMoreMenu()) return false;
    return (
      <DetailPanel>
        {getSelectedItemComponent(selectedMenuItem, data.rowData)}
        <Button
          onClick={() => {
            handleToggleDetailPanel(data.rowData);
            handleMenuClose();
          }}
          className={classes.detailPanelCloseButton}
          size="small"
        >
          Close X
        </Button>
      </DetailPanel>
    );
  };

  // todo determine whether to precheck

  const renderMyPatientsCheckbox = () => {
    if (!getAppSettingByKey("ENABLE_PROVIDER_FILTER")) return false;
    return (
      <MyPatientsCheckbox
        label={getAppSettingByKey("MY_PATIENTS_FILTER_LABEL")}
        shouldCheck={filterPatientsByProvider}
        changeEvent={(shouldCheck) => {
          setFilterPatientsByProvider(shouldCheck);
        }}
      ></MyPatientsCheckbox>
    );
  };

  React.useEffect(() => {
    //when page unloads, remove loading indicator
    window.addEventListener("beforeunload", handlePageUnload);
    if (!user) {
      handleErrorCallback({ status: 401 });
      return;
    }
    const { username, roles } = user;
    if (appSettings) {
      addMamotoTracking(appSettings["MATOMO_SITE_ID"], username);
      const clients = getClientsByRequiredRoles(
        appSettings["SOF_CLIENTS"],
        roles
      );
      if (!clients || !clients.length) {
        setErrorMessage("No SoF client match the user role(s) found");
      } else {
        setAppClients(clients);
      }
    }
    return () => {
      window.removeEventListener("beforeunload", handlePageUnload);
    };
  }, [user, appSettings]); //retrieval of settings should occur prior to patient list being rendered/initialized

  React.useEffect(
    () => tableRef.current.onQueryChange(),
    [filterPatientsByProvider]
  );

  return (
    <Container className={classes.container} id="patientList">
      {renderSearchTitle()}
      <Error message={errorMessage} style={errorStyle} />
      <div className="flex">
        {/* patient search row */}
        {renderPatientSearchRow()}
        {renderMyPatientsCheckbox()}
      </div>
      {/* patient list table */}

      <div className={`${classes.table} main`} aria-label="patient list table">
        <MaterialTable
          className={classes.table}
          columns={getColumns()}
          data={
            //any change in query will invoke this function
            (query) => getPatientList(query)
          }
          tableRef={tableRef}
          hideSortIcon={false}
          detailPanel={[
            {
              render: (data) => {
                return renderDetailedPanel(data);
              },
              isFreeAction: false,
            },
          ]}
          //overlay
          components={{
            OverlayLoading: () => (
              <OverlayElement>
                <CircularProgress></CircularProgress>
              </OverlayElement>
            ),
          }}
          actions={getTableActions()}
          options={getTableOptions()}
          icons={constants.tableIcons}
          onRowClick={(event, rowData) => {
            getTableRowEvent(event, rowData);
          }}
          editable={getTableEditableOptions()}
          localization={getTableLocalizations()}
        />
      </div>
      <LoadingModal open={openLoadingModal}></LoadingModal>
      <div className={classes.flexContainer}>
        {renderLegend()}
        <div>
          {renderRefreshButton()}
          {data.length > 0 && renderTablePagination()}
        </div>
      </div>
      {renderLaunchDialog()}
      {renderDropdownMenu()}
    </Container>
  );
}
