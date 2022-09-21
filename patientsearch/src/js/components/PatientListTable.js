import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import jsonpath from "jsonpath";
import DOMPurify from "dompurify";
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
import OverlayElement from "./OverlayElement";
import UrineScreen from "./UrineScreen";
import Agreement from "./Agreement";
import { useSettingContext } from "../context/SettingContextProvider";
import { tableIcons } from "../context/consts";
import theme from "../context/theme";
import {
  fetchData,
  getLocalDateTimeString,
  getUrlParameter,
  getRolesFromToken,
  getClientsByRequiredRoles,
  isString,
  validateToken,
} from "./Utility";

const useStyles = makeStyles({
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
  bold: {
    fontWeight: 500,
  },
  warning: {
    color: theme.palette.primary.warning,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    lineHeight: 1.7,
  },
  success: {
    fill: theme.palette.primary.success,
  },
  muted: {
    fill: theme.palette.muted.main,
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
});

let filterIntervalId = 0;

export default function PatientListTable() {
  const classes = useStyles();
  const appSettings = useSettingContext().appSettings;
  const [initialized, setInitialized] = React.useState(false);
  const [appClients, setAppClients] = React.useState(null);
  const [data, setData] = React.useState([]);
  const defaultFilters = {
    first_name: "",
    last_name: "",
    birth_date: "",
  };
  const defaultPagination = {
    pageSize: 20,
    pageNumber: 0,
    prevPageNumber: 0,
    disablePrevButton: true,
    disableNextButton: true,
    totalCount: 0,
    nextPageURL: "",
    prevPageURL: "",
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
  const [pagination, dispatch] = React.useReducer(
    paginationReducer,
    defaultPagination
  );
  const [currentFilters, setCurrentFilters] = React.useState(defaultFilters);
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
  const [openLaunchInfoModal, setOpenLaunchInfoModal] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [containNoPMPRow, setContainNoPMPRow] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = React.useState("");
  const [currentRow, setCurrentRow] = React.useState(null);
  const [actionLabel, setActionLabel] = React.useState(LAUNCH_BUTTON_LABEL);
  const [noDataText, setNoDataText] = React.useState("");
  const tableRef = React.useRef();
  const LAUNCH_BUTTON_LABEL = "VIEW";
  const CREATE_BUTTON_LABEL = "CREATE";
  const TOOLBAR_ACTION_BUTTON_ID = "toolbarGoButton";
  const MORE_MENU_KEY = "MORE_MENU";
  const noCacheParam = { cache: "no-cache" };
  const menuItems = [
    {
      text: "Add Urine Tox Screen",
      id: "UDS",
      component: (rowData) => <UrineScreen rowData={rowData}></UrineScreen>,
    },
    {
      text: "Add Controlled Substance Agreement",
      id: "CS_agreement",
      component: (rowData) => <Agreement rowData={rowData}></Agreement>,
    },
  ];
  const FieldNameMaps = {
    first_name: "given",
    last_name: "family",
    birth_date: "birthdate",
    last_accessed: "_lastUpdated",
  };
  const default_columns = [
    {
      label: "First Name",
      expr: "$.name[0].given[0]",
    },
    {
      label: "Last Name",
      expr: "$.name[0].family",
    },
    {
      label: "Birth Date",
      expr: "$.birthDate",
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
    let cols = configColumns ? configColumns : default_columns;
    const hasIdField = cols.filter((col) => col.field === "id").length > 0;
    //columns must include an id field, add if not present
    if (!hasIdField)
      cols.push({
        label: "id",
        hidden: true,
        expr: "$.id",
      });
    return cols.map((column) => {
      column.title = column.label;
      column.field = column.label.toLowerCase().replace(/\s/g, "_");
      column.emptyValue = "--";
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
    const baseURL = launchParams["launch_url"];
    const iss = getAppSettingByKey("SOF_HOST_FHIR_URL");
    if (!baseURL || !iss) {
      console.log("Missing ISS launch base URL");
      return "";
    }
    return `${baseURL}?patient=${patientId}&launch=${btoa(
      JSON.stringify({ a: 1, b: patientId })
    )}&iss=${encodeURIComponent(iss)}`;
  };
  const hasSoFClients = () => {
    return appClients && appClients.length > 0;
  };
  const hasMultipleSoFClients = () => {
    return appClients && appClients.length > 1;
  };
  const handleLaunchApp = (rowData, launchParams) => {
    //handle multiple SoF clients that can be launched
    //open a dialog here so user can select which one to launch?
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
    setTimeout(function () {
      sessionStorage.clear();
      window.location = launchURL;
    }, 50);
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
  const handleSearch = (rowData, launchParams) => {
    if (!rowData) {
      handleLaunchError("No patient data to proceed.");
      return false;
    }
    if (!launchParams) {
      launchParams =
        hasSoFClients() && appClients.length === 1 ? appClients[0] : null;
    }
    //if all well, prepare to launch app
    const allowToLaunch =
      (rowData.id && hasMultipleSoFClients()) ||
      (launchParams &&
        (needExternalAPILookup() ? inPDMP(rowData) : rowData.id));

    if (allowToLaunch) {
      handleLaunchApp(rowData, launchParams);
      return;
    }
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
    const noResultErrorMessage = needExternalAPILookup()
      ? "<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>"
      : "No matched patient found";
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
        ...noCacheParam,
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
        handleLaunchApp(formatData(response)[0], launchParams);
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
            let value = jsonpath.value(source, col.expr) || null;
            if (col.dataType === "date") {
              value = getLocalDateTimeString(value);
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
      }).length
    );
  };
  const setNoPMPFlag = (data) => {
    if (!data || !data.length) return false;
    let hasNoPMPRow =
      data.filter((rowData) => {
        return !inPDMP(rowData);
      }).length > 0;
    //legend will display if contain no pmp row flag is set
    if (hasNoPMPRow) setContainNoPMPRow(true);
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
        ? CREATE_BUTTON_LABEL
        : LAUNCH_BUTTON_LABEL
    );
  };
  const handleNoDataText = (filters) => {
    let text = "No matching record found.<br/>";
    const nonEmptyFilters = getNonEmptyFilters(filters);
    if (nonEmptyFilters.length < 3) {
      text += "Try entering all First name, Last name and Birth Date.";
    } else if (nonEmptyFilters.length === 3) {
      text += `Click on ${CREATE_BUTTON_LABEL} button to create new patient`;
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
    dispatch({ type: "reset" });
  };
  const handleChangePage = (event, newPage) => {
    dispatch({
      payload: {
        prevPageNumber: pagination.pageNumber,
        pageNumber: newPage,
      },
    });
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };

  const handleChangeRowsPerPage = (event) => {
    dispatch({
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
    setCurrentFilters(defaultFilters);
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
      !appSettings[MORE_MENU_KEY] ||
      appSettings[MORE_MENU_KEY].filter((item) => item && item !== "")
        .length === 0
    );
  };
  const shouldShowMenuItem = (id) => {
    let arrMenu = getAppSettingByKey(MORE_MENU_KEY);
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
  const getPatientList = (query) => {
    let sortField =
      query.orderBy && query.orderBy.field
        ? FieldNameMaps[query.orderBy.field]
        : "_lastUpdated";
    let sortDirection = query.orderDirection ? query.orderDirection : "desc";
    let sortMinus = sortDirection !== "asc" ? "-" : "";
    let filterBy = [];

    if (currentFilters && currentFilters.length) {
      currentFilters.forEach((item) => {
        if (item.value) {
          filterBy.push(`${FieldNameMaps[item.field]}:contains=${item.value}`);
        }
      });
    }
    let searchString = filterBy.length ? filterBy.join("&") : "";
    let defaults = {
      data: [],
      page: 0,
      totalCount: 0,
    };
    const resetAll = () => {
      dispatch({ type: "empty" });
      setInitialized(true);
    };
    let apiURL = `/fhir/Patient?_include=Patient:link&_total=accurate&_count=${pagination.pageSize}`;
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
      fetchData(apiURL, noCacheParam, function (e) {
        resetAll();
        handleErrorCallback(e);
        resolve(defaults);
      })
        .then((response) => {
          if (!response || !response.entry || !response.entry.length) {
            resetAll();
            resolve(defaults);
            return;
          }
          let responseData = formatData(response.entry);
          setData(responseData || []);
          if (needExternalAPILookup()) setNoPMPFlag(responseData);
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
          dispatch({
            payload: {
              nextPageURL: newNextURL,
              prevPageURL: newPrevURL,
              disableNextButton: !hasNextLink,
              disablePrevButton: pagination.pageNumber === 0,
              totalCount: response.total,
            },
          });
          setTimeout(() => setInitialized(true), 250);
          resolve({
            data: responseData,
            page: currentPage,
            totalCount: response.total,
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
          setInitialized(true);
          resolve(defaults);
        });
    });
  };

  const handlePageUnload = () => {
    setTimeout(() => setOpenLoadingModal(false), 500);
  };

  React.useEffect(() => {
    //when page unloads, remove loading indicator
    window.addEventListener("beforeunload", handlePageUnload);
    validateToken().then(
      (token) => {
        if (!token) {
          console.log("Redirecting...");
          window.location = "/clear_session";
          return false;
        }
        if (appSettings) {
          const clients = getClientsByRequiredRoles(
            appSettings["SOF_CLIENTS"],
            getRolesFromToken(token)
          );
          if (!clients || !clients.length) {
            setErrorMessage("No SoF client match the user role(s) found");
          } else {
            setAppClients(clients);
          }
        }
      },
      (e) => {
        console.log("token validation error ", e);
        handleErrorCallback(e);
      }
    );
    return () => {
      window.removeEventListener("beforeunload", handlePageUnload);
    };
  }, [appSettings]); //retrieval of settings should occur prior to patient list being rendered/initialized

  return (
    <React.Fragment>
      <Container className={classes.container} id="patientList">
        <h2>Patient Search</h2>
        <Error message={errorMessage} style={errorStyle} />
        <table className={classes.filterTable}>
          <tbody>
            <FilterRow
              onFiltersDidChange={onFiltersDidChange}
              launchFunc={handleSearch}
              launchButtonLabel={actionLabel}
              launchButtonId={TOOLBAR_ACTION_BUTTON_ID}
            />
          </tbody>
        </table>
        {hasSoFClients() && (
          <div
            className={`${classes.table} main`}
            aria-label="patient list table"
          >
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
                    return (
                      <DetailPanel>
                        {getSelectedItemComponent(
                          selectedMenuItem,
                          data.rowData
                        )}
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
              actions={[
                ...(appClients && appClients.length
                  ? appClients.map((client, index) => {
                      return {
                        icon: () => (
                          <span
                            className={classes.button}
                            key={`actionButton_${index}`}
                          >
                            {client.label}
                          </span>
                        ),
                        onClick: (event, rowData) => {
                          event.stopPropagation();
                          handleSearch(rowData, client);
                        },
                        tooltip: `Launch ${client.id} application for the user`,
                      };
                    })
                  : []),
                {
                  icon: () =>
                    !shouldHideMoreMenu() && (
                      <MoreHorizIcon
                        color="primary"
                        className={classes.moreIcon}
                      ></MoreHorizIcon>
                    ),
                  onClick: (event, rowData) => handleMenuClick(event, rowData),
                  tooltip: shouldHideMoreMenu() ? "" : "More",
                },
              ]}
              options={{
                paginationTypestepped: "stepped",
                showFirstLastPageButtons: false,
                paging: false,
                padding: "dense",
                emptyRowsWhenPaging: false,
                debounceInterval: 300,
                detailPanelColumnAlignment: "right",
                toolbar: false,
                filtering: false,
                sorting: true,
                search: false,
                showTitle: false,
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
                actionsColumnIndex: -1,
              }}
              icons={tableIcons}
              onRowClick={(event, rowData) => {
                event.stopPropagation();
                if (!hasSoFClients()) return;
                handleSearch(rowData);
              }}
              editable={{
                onRowDelete: (oldData) =>
                  fetchData("/fhir/Patient/" + oldData.id, {
                    method: "DELETE",
                  })
                    .then(() => {
                      setTimeout(() => {
                        const dataDelete = [...data];
                        const target = dataDelete.find(
                          (el) => el.id === oldData.id
                        );
                        const index = dataDelete.indexOf(target);
                        dataDelete.splice(index, 1);
                        setData([...dataDelete]);
                        setErrorMessage("");
                      }, 500);
                    })
                    .catch(() => {
                      setErrorMessage(
                        "Unable to remove patient from the list."
                      );
                    }),
              }}
              localization={{
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
              }}
            />
          </div>
        )}
        {initialized && (
          <div className={classes.flexContainer}>
            {containNoPMPRow && (
              <div className={classes.legend}>
                <span className={classes.legendIcon}></span> Not in PMP
              </div>
            )}
            {!containNoPMPRow && <div className={classes.spacer}></div>}
            <div>
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
            </div>
          </div>
        )}
        <LoadingModal open={openLoadingModal}></LoadingModal>
        <DialogBox
          open={openLaunchInfoModal}
          onClose={() => onLaunchDialogClose()}
          title={
            currentRow
              ? `${currentRow.last_name}, ${currentRow.first_name}`
              : ""
          }
          body={
            <div className={classes.flex}>
              {hasSoFClients() &&
                appClients.map((item, index) => {
                  return (
                    <Button
                      key={`launchButton_${index}`}
                      color="primary"
                      variant="contained"
                      className={classes.flexButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchApp(currentRow, item);
                      }}
                    >{`Launch ${item.id}`}</Button>
                  );
                })}
            </div>
          }
        ></DialogBox>
        <Dropdown
          anchorEl={anchorEl}
          handleMenuClose={handleMenuClose}
          handleMenuSelect={handleMenuSelect}
          menuItems={menuItems.filter((item) => shouldShowMenuItem(item.id))}
        ></Dropdown>
      </Container>
    </React.Fragment>
  );
}
