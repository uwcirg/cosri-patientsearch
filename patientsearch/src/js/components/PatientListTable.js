import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import MaterialTable from "material-table";
import RefreshIcon from "@material-ui/icons/Refresh";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import CircularProgress from "@material-ui/core/CircularProgress";
import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container";
import Modal from "@material-ui/core/Modal";
import Paper from "@material-ui/core/Paper";
import TablePagination from "@material-ui/core/TablePagination";
import Tooltip from "@material-ui/core/Tooltip";
import Dropdown from "./Dropdown";
import Error from "./Error";
import FilterRow from "./FilterRow";
import UrineScreen from "./UrineScreen";
import Agreement from "./Agreement";
import {tableIcons} from "../context/consts";
import theme from "../context/theme";
import {
  fetchData,
  getLocalDateTimeString,
  getSettings,
  getUrlParameter,
  isString,
} from "./Utility";

const useStyles = makeStyles({
  container: {
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: theme.spacing(2),
    marginTop: 148,
    maxWidth: "1080px",
  },
  overlayContainer: {
    display: "table",
    width: "100%",
    height: "100%",
    background: "rgb(255 255 255 / 70%)"
  },
  overlayElement: {
    display: "table-cell",
    width: "100%",
    height: "100%",
    verticalAlign: "middle",
    textAlign: "center"
  },
  filterTable: {
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(20),
    ["@media (min-width:639px)"]: {
      marginTop: 0
    }
  },
  table: {
    minWidth: 320,
    maxWidth: "100%",
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
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: 0,
  },
  loadingText: {
    marginRight: theme.spacing(1.5),
    fontSize: "18px",
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
    width: "120px",
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
  detailPanelWrapper: {
    backgroundColor: "#dde7e6",
    padding: theme.spacing(0.25),
  },
  detailPanelContainer: {
    position: "relative",
    minHeight: theme.spacing(8),
    backgroundColor: "#fbfbfb",
  },
  detailPanelCloseButton: {
    position: "absolute",
    top: theme.spacing(1.5),
    right: theme.spacing(6),
    color: theme.palette.primary.main,
  },
});

let appSettings = {};
let filterIntervalId = 0;

export default function PatientListTable() {
  const classes = useStyles();
  const [settingInitialized, setSettingInitialized] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);
  const [data, setData] = React.useState([]);
  const defaultFilters = {
    first_name: "",
    last_name: "",
    dob: "",
  };
  const [currentFilters, setCurrentFilters] = React.useState(defaultFilters);
  const [pageSize, setPageSize] = React.useState(20);
  const [pageNumber, setPageNumber] = React.useState(0);
  const [prevPageNumber, setPrevPageNumber] = React.useState(0);
  const [disablePrevButton, setDisablePrevButton] = React.useState(true);
  const [disableNextButton, setDisableNextButton] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);
  const [nextPageURL, setNextPageURL] = React.useState("");
  const [prevPageURL, setPrevPageURL] = React.useState("");
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [containNoPMPRow, setContainNoPMPRow] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = React.useState("");
  const [currentRow, setCurrentRow] = React.useState(null);
  const tableRef = React.useRef();
  const [actionLabel, setActionLabel] = React.useState(LAUNCH_BUTTON_LABEL);
  const [noDataText, setNoDataText] = React.useState("");
  const LAUNCH_BUTTON_LABEL = "VIEW";
  const CREATE_BUTTON_LABEL = "CREATE";
  const TOOLBAR_ACTION_BUTTON_ID = "toolbarGoButton";
  const MORE_MENU_KEY = "MORE_MENU";
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
    dob: "birthdate",
    lastUpdated: "_lastUpdated",
  };
  const columns = [
    //default sort by id in descending order
    { field: "id", hidden: true, filtering: false },
    {
      title: "First Name",
      field: "first_name",
      filterPlaceholder: "First Name",
      emptyValue: "--",
    },
    {
      title: "Last Name",
      field: "last_name",
      filterPlaceholder: "Last Name",
      emptyValue: "--",
    },
    {
      title: "Birth Date",
      field: "dob",
      filterPlaceholder: "YYYY-MM-DD",
      emptyValue: "--",
    },
    /* the field for last accessed is patient.meta.lastupdated? */
    {
      title: "Last Accessed",
      field: "lastUpdated",
      filtering: false,
      align: "center",
      defaultSort: "desc",
    },
  ];
  const errorStyle = { display: errorMessage ? "block" : "none" };
  const toTop = () => {
    window.scrollTo(0, 0);
  };
  const setAppSettings = function (settings) {
    appSettings = settings;
  };
  const getPatientPMPSearchURL = (data) => {
    if (data.id && data.identifier) return `/fhir/Patient/${data.id}`;
    const dataURL = "/external_search/Patient";
    const params = [
      `subject:Patient.name.given=${data.first_name}`,
      `subject:Patient.name.family=${data.last_name}`,
      `subject:Patient.birthdate=eq${data.dob}`,
    ];
    return `${dataURL}?${params.join("&")}`;
  };
  const getLaunchBaseURL = function () {
    return appSettings["SOF_CLIENT_LAUNCH_URL"];
  };
  const getISS = function () {
    return appSettings["SOF_HOST_FHIR_URL"];
  };
  const getLaunchURL = function (patientId) {
    if (!patientId) {
      console.log("Missing information: patient Id");
      return "";
    }
    let baseURL = getLaunchBaseURL();
    let iss = getISS();
    if (!baseURL || !iss) {
      console.log("Missing ISS launch base URL");
      return "";
    }
    let launchParam = btoa(JSON.stringify({ b: patientId }));
    return `${baseURL}?launch=${launchParam}&iss=${iss}`;
  };
  const noCacheParam = { cache: "no-cache" };

  const existsIndata = function (rowData) {
    if (!data) return false;
    if (!rowData) return false;
    return (
      data.filter((item) => {
        return parseInt(item.id) === parseInt(rowData.id);
      }).length > 0
    );
  };
  const addDataRow = function (rowData) {
    if (!rowData || !rowData.id) return false;
    let newData = formatData(rowData);
    if (newData && !existsIndata(newData[0])) {
      setData([newData[0], ...data]);
    }
  };
  const handleExpiredSession = function () {
    sessionStorage.clear();
    setTimeout(() => {
      // /home is a protected endpoint, the backend will request a new Access Token from Keycloak if able, else prompt a user to log in again
      window.location = "/home";
    }, 0);
  };
  const handleSearch = function (event, rowData) {
    if (!rowData) {
      console.log("No valid data to perform patient search");
      return false;
    }
    setOpenLoadingModal(true);
    setErrorMessage("");
    const urls = [getPatientPMPSearchURL(rowData), "./validate_token"];
    Promise.allSettled([
      fetch(urls[0], {
        ...{
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: rowData.resource ? JSON.stringify(rowData.resource) : null
        },
        ...noCacheParam,
      }),
      fetch(urls[1]),
    ])
      .then(async ([searchResult, tokenResult]) => {
        const searchResponse = searchResult.value;
        const tokenResponse = tokenResult.value;

        //dealing with unauthorized error, status code = 401
        if (!searchResponse.ok || !tokenResponse.ok) {
          if (parseInt(searchResponse.status) === 401 ||
          parseInt(tokenResponse.status) === 401) {
            //redirect to home
            handleExpiredSession();
            throw "Unauthorized";
          }
        }

        //fetch returns a simple flag of ok to indicate whether whether an HTTP response’s status code is in the successful range or not
        if (!searchResponse.ok) {
          //check if error response is text/html first
          let responseText =
            typeof searchResponse.text !== "undefined"
              ? await searchResponse.text()
              : "";
          if (!responseText) {
            //check if error response is in JSON
            responseText =
              typeof searchResponse.json !== "undefined"
                ? await searchResponse.json()
                : "";
          }
          throw responseText ? responseText : searchResponse.statusText; //throw error so can be caught later
        }
        try {
          return [await searchResponse.json(), await tokenResponse.json()];
        } catch (e) {
          console.log(
            "Error processing patient search and validating token ",
            e
          );
        }
        return false;
      })
      .then((results) => {
        if (!results || !results.length) {
          setErrorMessage("Data processing error in [handleSearch]");
          toTop();
          setOpenLoadingModal(false);
          return false;
        }
        if (
          !results[1] ||
          (results[1] &&
            (!results[1].valid ||
              parseInt(results[1].access_expires_in) <= 0 ||
              parseInt(results[1].refresh_expires_in) <= 0))
        ) {
          //invalid token, force redirecting
          console.log("Redirecting...");
          handleExpiredSession();
          setOpenLoadingModal(true);
          return false;
        }
        let response = results[0];
        //response can be an array or just object now
        if (results[0] && results[0].entry && results[0].entry[0])
          response = results[0].entry[0];
        if (!response) {
          setErrorMessage(
            "<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>"
          );
          toTop();
          setOpenLoadingModal(false);
          return false;
        }
        try {
          addDataRow(response);
        } catch (e) {
          console.log("Error occurred adding row to table ", e);
        }
        setErrorMessage("");
        let launchURL = "";
        let launchID = response.id;
        if (!launchID) {
          setErrorMessage(
            "<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>"
          );
          toTop();
          setOpenLoadingModal(false);
          return false;
        }
        try {
          launchURL = rowData.url || getLaunchURL(launchID);
        } catch (e) {
          setErrorMessage(
            "Unable to launch application. Invalid launch URL. Missing configurations."
          );
          toTop();
          setOpenLoadingModal(false);
          //log error to console
          console.log(`Launch URL error: ${e}`);
          return false;
        }
        if (!launchURL) {
          setErrorMessage(
            "Unable to launch application. Missing launch URL. Missing configurations."
          );
          toTop();
          setOpenLoadingModal(false);
          return false;
        }
        setTimeout(function () {
          sessionStorage.clear();
          window.location = launchURL;
        }, 50);
      })
      .catch((e) => {
        let returnedError = e;
        try {
          returnedError = JSON.parse(e);
          returnedError = returnedError.message
            ? returnedError.message
            : returnedError;
        } catch (e) {
          console.log("error parsing error message ", e);
        }
        setErrorMessage(
          `<p>COSRI is unable to return PMP information. This may be due to PMP system being down or a problem with the COSRI connection to PMP.</p><p>Error returned from the system: ${returnedError}</p>`
        );
        //log error to console
        console.log(`Patient search error: ${e}`);
        toTop();
        setOpenLoadingModal(false);
      });
  };
  const formatData = (data) => {
    if (!data) return false;
    if (!Array.isArray(data)) {
      data = [data];
    }
    return data && Array.isArray(data)
      ? data.map((item) => {
          let source = item.resource ? item.resource : item;
          let patientId = source && source["id"] ? source["id"] : "";
          return {
            first_name:
              source && source.name && source.name[0]
                ? source.name[0]["given"][0]
                : "",
            last_name:
              source && source.name && source.name[0]
                ? source.name[0]["family"]
                : "",
            dob: source && source["birthDate"] ? source["birthDate"] : "",
            url: getLaunchURL(patientId),
            identifier:
              source && source.identifier && source.identifier.length
                ? source.identifier
                : null,
            lastUpdated:
              source && source.meta && source.meta.lastUpdated
                ? getLocalDateTimeString(source.meta.lastUpdated)
                : "",
            gender: source && source["gender"] ? source["gender"] : "",
            resource: source,
            id: patientId,
          };
        })
      : data;
  };

  function setNoPMPFlag(data) {
    if (!data || !data.length) return false;
    let hasNoPMPRow =
      data.filter((rowData) => {
        return !inPDMP(rowData);
      }).length > 0;
    //legend will display if contain no pmp row flag is set
    if (hasNoPMPRow) setContainNoPMPRow(true);
  }

  function containEmptyFilter(filters) {
    if (!filters || !filters.length) return true;
    return getNonEmptyFilters(filters).length === 0;
  }
  function getNonEmptyFilters(filters) {
    if (!filters) return [];
    return filters.filter(item => item.value && item.value !== "");
  }

  function handleActionLabel(filters) {
    setActionLabel(getNonEmptyFilters(filters).length === 3? CREATE_BUTTON_LABEL: LAUNCH_BUTTON_LABEL);
  }
  function handleNoDataText(filters) {
    let text = "";
    const nonEmptyFilters = getNonEmptyFilters(filters);
    if (nonEmptyFilters.length < 3) {
      text = "Try entering all First name, Last name and Birth Date.";
    } else if (nonEmptyFilters.length === 3) {
      text = `Click on ${CREATE_BUTTON_LABEL} button to create new patient`;
    }
    setNoDataText(text);
  }

  function onFiltersDidChange(filters, clearAll) {
    clearTimeout(filterIntervalId);
    filterIntervalId = setTimeout(function () {
      handleNoDataText(filters);
      handleActionLabel(filters);
      if (filters && filters.length) {
        setCurrentFilters(filters);
        resetPaging();
        if (containEmptyFilter(filters)) {
          handleRefresh();
          return filters;
        }
        if (tableRef && tableRef.current) tableRef.current.onQueryChange();
        return filters;
      } else {
        if (clearAll) {
          setCurrentFilters(defaultFilters);
          resetPaging();
          if (tableRef && tableRef.current) tableRef.current.onQueryChange();
          return defaultFilters;
        }
        return defaultFilters;
      }
    }, 200);
  }

  function inPDMP(rowData) {
    if (!rowData) return false;
    return (
      rowData.identifier &&
      rowData.identifier.filter((item) => {
        return (
          item.system === "https://github.com/uwcirg/script-fhir-facade" &&
          item.value === "found"
        );
      }).length
    );
  }

  function patientListInitialized() {
    return initialized;
  }

  function handleErrorCallback(e) {
    if (e && e.status === 401) {
      setErrorMessage("Unauthorized.");
      window.location = "/logout?unauthorized=true";
      return;
    }
    setErrorMessage(
      isString(e)
        ? e
        : e && e.message
        ? e.message
        : "Error occurred processing data"
    );
  }
  const resetPaging = () => {
    setNextPageURL("");
    setPrevPageURL("");
    setPageNumber(0);
    setPageSize(pageSize);
  };

  const handleChangePage = (event, newPage) => {
    setPrevPageNumber(pageNumber);
    setPageNumber(newPage);
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };

  const handleChangeRowsPerPage = (event) => {
    setPageSize(parseInt(event.target.value, 10));
    setNextPageURL("");
    setPrevPageURL("");
    setPageNumber(0);
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };

  const handleRefresh = () => {
    document.querySelector("#btnClear").click();
    setErrorMessage("");
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
      tableRef.current.onToggleDetailPanel(
        [currentRow.tableData.id],
        tableRef.current.props.detailPanel[0].render
      );
    }, 200);
  };

  const getMoreMenuSetting = () => {
    return appSettings[MORE_MENU_KEY] ? appSettings[MORE_MENU_KEY] : [];
  };
  const shouldHideMoreMenu = () => {
    return (
      Object.keys(appSettings).length &&
      (!appSettings[MORE_MENU_KEY] || appSettings[MORE_MENU_KEY].length === 0)
    );
  };
  const shouldShowMenuItem = (id) => {
    let arrMenu = getMoreMenuSetting();
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
      resetPaging();
      setInitialized(true);
    };
    let apiURL = `/fhir/Patient?_include=Patient:link&_total=accurate&_count=${pageSize}`;
    if (pageNumber > prevPageNumber && nextPageURL) {
      apiURL = nextPageURL;
    } else if (pageNumber < prevPageNumber && prevPageURL) {
      apiURL = prevPageURL;
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
          setInitialized(true);
          let responseData = formatData(response.entry);
          setData(responseData || []);
          setNoPMPFlag(responseData);
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
            ? responsePageoffset / pageSize
            : 0;
          let hasNextLink = responseNextLink && responseNextLink.length;
          let hasPrevLink = responsePrevLink && responsePrevLink.length;
          let newNextURL = hasNextLink ? responseNextLink[0].url : "";
          let newPrevURL = hasPrevLink
            ? responsePrevLink[0].url
            : hasSelfLink
            ? responseSelfLink[0].url
            : "";
          setNextPageURL(newNextURL);
          setPrevPageURL(newPrevURL);
          setDisableNextButton(!hasNextLink);
          setDisablePrevButton(pageNumber === 0);
          setTotalCount(response.total);
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
          resetAll();
          resolve(defaults);
        });
    });
  };

  React.useEffect(() => {
    //when page unloads, remove loading indicator
    window.addEventListener("beforeunload", function () {
      setTimeout(() => setOpenLoadingModal(false), 50);
    });
    getSettings((data) => {
      if (data.error) {
        handleErrorCallback(data.error);
        setSettingInitialized(true);
        setErrorMessage(`Error retrieving app setting: ${data.error}`);
        return;
      }
      setSettingInitialized(true);
      setAppSettings(data);
    }, true); //no caching
  }, []); //retrieval of settings should occur prior to patient list being rendered/initialized

  return (
    <React.Fragment>
      <Container className={classes.container} id="patientList">
        <h2>COSRI Patient Search</h2>
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
        {settingInitialized && <div className={`${classes.table} main`} aria-label="patient list table">
            <MaterialTable
              className={classes.table}
              columns={columns}
              data={
                //any change in query will invoke this function
                (query) => getPatientList(query)
              }
              tableRef={tableRef}
              hideSortIcon={false}
              detailPanel={[
                {
                  render: (rowData) => {
                    return (
                      <div className={classes.detailPanelWrapper}>
                        <Paper
                          elevation={1}
                          variant="outlined"
                          className={classes.detailPanelContainer}
                        >
                          {getSelectedItemComponent(selectedMenuItem, rowData)}
                          <Button
                            onClick={() => {
                              tableRef.current.onToggleDetailPanel(
                                [rowData.tableData.id],
                                tableRef.current.props.detailPanel[0].render
                              );
                              handleMenuClose();
                            }}
                            className={classes.detailPanelCloseButton}
                            size="small"
                          >
                            Close X
                          </Button>
                        </Paper>
                      </div>
                    );
                  },
                  isFreeAction: false,
                },
              ]}
              //overlay
              components={{
                OverlayLoading: () => (
                    <div className={classes.overlayContainer}>
                        <div className={classes.overlayElement}>
                          <CircularProgress></CircularProgress>
                        </div>
                    </div>
                )
              }}
              actions={[
                {
                  icon: () => (
                    <span className={classes.button}>
                      {LAUNCH_BUTTON_LABEL}
                    </span>
                  ),
                  onClick: (event, rowData) => handleSearch(event, rowData),
                  tooltip: "Launch COSRI application for the user",
                },
                {
                  icon: () => (
                    <MoreHorizIcon
                      color="primary"
                      className={`more-icon ${
                        shouldHideMoreMenu() ? "ghost" : ""
                      }`}
                    ></MoreHorizIcon>
                  ),
                  onClick: (event, rowData) => handleMenuClick(event, rowData),
                  tooltip: "More",
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
                  backgroundColor: !inPDMP(rowData)
                    ? theme.palette.primary.disabled
                    : "#FFF",
                }),
                actionsCellStyle: {
                  paddingLeft: theme.spacing(2),
                  paddingRight: theme.spacing(2),
                  minWidth: "25%",
                  justifyContent: "center",
                },
                actionsColumnIndex: -1,
              }}
              icons={tableIcons}
              onRowClick={(event, rowData) => {
                event.stopPropagation();
                handleSearch(event, rowData);
              }}
              editable={{
                onRowDelete: (oldData) =>
                  fetchData("/fhir/Patient/" + oldData.id, { method: "DELETE" })
                    .then(() => {
                      setTimeout(() => {
                        const dataDelete = [...data];
                        const index = oldData.tableData.id;
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
                    <div id="emptyDataContainer" className={classes.flex}>
                      <div className={classes.warning}>
                        <div>No matching patient found.</div>
                        <div>{noDataText}</div>
                      </div>
                    </div>
                  ),
                },
              }}
            />
          </div>
        }
        <div className={classes.flexContainer}>
          {patientListInitialized() && containNoPMPRow && (
            <div className={classes.legend}>
              <span className={classes.legendIcon}></span> Not in PMP
            </div>
          )}
          {patientListInitialized() && !containNoPMPRow && (
            <div className={classes.spacer}></div>
          )}
          <div>
            {patientListInitialized() && (
              <div className={`${totalCount === 0 ? "ghost" : ""}`}>
                <div className={classes.refreshButtonContainer}>
                  <Tooltip title="Refresh the list">
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<RefreshIcon />}
                      onClick={handleRefresh}
                    >
                      Refresh
                    </Button>
                  </Tooltip>
                </div>
                <TablePagination
                  id="patientListPagination"
                  className={classes.pagination}
                  rowsPerPageOptions={[10, 20, 50]}
                  onPageChange={handleChangePage}
                  page={pageNumber}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  count={totalCount}
                  size="small"
                  component="div"
                  nextIconButtonProps={{
                    disabled: disableNextButton,
                    color: "primary",
                  }}
                  backIconButtonProps={{
                    disabled: disablePrevButton,
                    color: "primary",
                  }}
                  SelectProps={{ variant: "outlined" }}
                />
              </div>
            )}
          </div>
        </div>
        <Modal
          open={openLoadingModal}
          aria-labelledby="loading-modal"
          aria-describedby="loading-modal"
          disableAutoFocus
          disableEnforceFocus
          className={classes.modal}
        >
          <div className={classes.paper}>
            <div className={classes.flex}>
              <span className={classes.loadingText}>Loading ...</span>{" "}
              <CircularProgress color="primary" />
            </div>
          </div>
        </Modal>
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
