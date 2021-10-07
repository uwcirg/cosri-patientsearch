import React from 'react';
import { forwardRef } from 'react';
import { makeStyles} from '@material-ui/core/styles';
import MaterialTable from 'material-table';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import Check from '@material-ui/icons/Check';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import ClearIcon from '@material-ui/icons/Clear';
import RefreshIcon from '@material-ui/icons/Refresh';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import Delete from '@material-ui/icons/Delete';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Search from '@material-ui/icons/Search';
import Tooltip from '@material-ui/core/Tooltip';
import Modal from '@material-ui/core/Modal';
import TablePagination from '@material-ui/core/TablePagination';
import Error from "./Error";
import FilterRow from "./FilterRow";
import theme from '../context/theme';
import {getLocalDateTimeString, getUrlParameter, isString} from "./Utility";

const useStyles = makeStyles({
    container: {
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: theme.spacing(2),
        marginTop: 148,
        maxWidth: "1080px"
    },
    filterTable: {
      marginBottom: theme.spacing(1)
    },
    table: {
        minWidth: 450,
        maxWidth: "100%"
    },
    paper: {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[5],
      padding: theme.spacing(4, 4, 4),
      border: 0,
      minWidth: "250px",
    },
    flex: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap'
    },
    modal: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 0
    },
    loadingText: {
      marginRight: theme.spacing(1.5),
      fontSize: "18px"
    },
    label: {
      marginRight: theme.spacing(1.5)
    },
    button: {
      background: theme.palette.primary.main,
      padding: theme.spacing(1, 2, 1),
      color: "#FFF",
      fontSize: "12px",
      borderRadius: "4px",
      width: "120px",
      fontWeight: 500,
      textTransform: "uppercase",
      border: 0
    },
    bold: {
      fontWeight: 500
    },
    warning: {
      color: theme.palette.primary.warning,
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(3),
      lineHeight: 1.7
    },
    success: {
      fill: theme.palette.primary.success
    },
    muted: {
      fill: theme.palette.muted.main
    },
    legend: {
      marginTop: theme.spacing(2.5),
    },
    pagination: {
      marginTop: theme.spacing(1),
      display: "inline-block",
      border: "2px solid #ececec"
    },
    legendIcon: {
      backgroundColor: theme.palette.primary.disabled,
      width: theme.spacing(6),
      height: theme.spacing(3),
      marginRight: theme.spacing(0.5),
      display: "inline-block",
      verticalAlign: "bottom"
    },
    flexContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "top",
      flexWrap: "wrap"
    },
    refreshButtonContainer: {
      display: "inline-block",
      verticalAlign: "top",
      marginTop: theme.spacing(2.5),
      marginRight: theme.spacing(2)
    }
});

let appSettings = {};
let filterIntervalId = 0;

export default function PatientListTable(props) {
  const classes = useStyles();
  const [initialized, setInitialized] = React.useState(false);
  const [data, setData] = React.useState([]);
  const defaultFilters = {
    "first_name": "",
    "last_name": "",
    "dob": ""
  };
  const [currentFilters, setCurrentFilters] = React.useState(defaultFilters);
  const [pageSize, setPageSize] = React.useState(20);
  const [pageNumber, setPageNumber] = React.useState(0);
  const [prevPageNumber, setPrevPageNumber] = React.useState(0);
  const [disablePrevButton, setDisablePrevButton] = React.useState(true);
  const [disableNextButton, setDisableNextButton] = React.useState(true);
  const [nextPageURL, setNextPageURL] = React.useState("");
  const [prevPageURL, setPrevPageURL] = React.useState("");
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [containNoPMPRow, setContainNoPMPRow] = React.useState(false);
  const tableRef = React.useRef();
  const LAUNCH_BUTTON_LABEL = "VIEW";
  const CREATE_BUTTON_LABEL = "CREATE";
  const NO_DATA_ELEMENT_ID = "noDataContainer";
  const TOOLBAR_ACTION_BUTTON_ID = "toolbarGoButton";
  const tableIcons = {
    Check: forwardRef((props, ref) => <Check {...props} ref={ref} className={classes.success} />),
    Clear: forwardRef((props, ref) => <ClearIcon {...props} ref={ref} />),
    Filter: forwardRef((props, ref) => <Search {...props} ref={ref} color="primary" />),
    FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
    LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
    NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
    PreviousPage: forwardRef((props, ref) => <ChevronLeft {...props} ref={ref} />),
    SortArrow: forwardRef((props, ref) => <ArrowDownward {...props} ref={ref} color="primary" />),
    Delete: forwardRef((props, ref) => <Delete {...props} ref={ref} size="small" className={classes.muted}>Remove</Delete>),
  };
  const FieldNameMaps = {
    "first_name": "given",
    "last_name": "family",
    "dob": "birthdate",
    "lastUpdated": "_lastUpdated"
  };
  const columns = [
    //default sort by id in descending order
    {field: "id", hidden: true, filtering: false},
    {title: "First Name", field: "first_name", filterPlaceholder: "First Name", emptyValue: "--"},
    {title: "Last Name", field: "last_name", filterPlaceholder: "Last Name", emptyValue: "--"},
    {title: "Birth Date", field: "dob", filterPlaceholder: "YYYY-MM-DD", emptyValue: "--"},
    /* the field for last accessed is patient.meta.lastupdated? */
    {title: "Last Accessed", field: "lastUpdated", filtering: false, align: "center", defaultSort: "desc"}
  ];
  const errorStyle = {"display" : errorMessage? "block": "none"};
  const toTop = () => {
    window.scrollTo(0, 0);
  }
  const setAppSettings = function(settings) {
    appSettings = settings;
  }
  const getPatientPMPSearchURL = (data) => {
    if (data.id && data.identifier) return `/fhir/Patient/${data.id}`;
    const dataURL = "/external_search/Patient";
    const params = [
          `subject:Patient.name.given=${data.first_name}`,
          `subject:Patient.name.family=${data.last_name}`,
          `subject:Patient.birthdate=eq${data.dob}`
      ];
      return `${dataURL}?${params.join("&")}`;
  };
  const getLaunchBaseURL = function() {
    return appSettings["SOF_CLIENT_LAUNCH_URL"];
  }
  const getISS = function() {
    return appSettings["SOF_HOST_FHIR_URL"];
  }
  const getLaunchURL = function(patientId) {
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
    let launchParam = btoa(JSON.stringify({"b":patientId}));
    return `${baseURL}?launch=${launchParam}&iss=${iss}`;
  };
  const noCacheParam = {cache: "no-cache"};

  async function fetchData(url, params, errorCallback) {
    const MAX_WAIT_TIME = 20000;
    params = params || {};
    errorCallback = errorCallback || function() {};
    // Create a promise that rejects in maximum wait time in milliseconds
    let timeoutPromise = new Promise((resolve, reject) => {
      let id = setTimeout(() => {
        clearTimeout(id);
        reject(`Timed out in ${MAX_WAIT_TIME} ms.`)
      }, MAX_WAIT_TIME);
    });
    /*
     * if for some reason fetching the request data doesn't resolve or reject withing the maximum waittime,
     * then the timeout promise will kick in
     */
    let json = null;
    let results = await Promise.race([
      fetch(url, params),
      timeoutPromise
    ]).catch(e => {
        console.log("error retrieving data ", e);
        errorCallback(e);
        throw e;
    });

    if (!results || !results.ok) {
      console.log("no results returned");
      errorCallback(results ? results : "error retrieving data");
      return null;
    }

    try {
      //read response stream
      json = await (results.json()).catch(e => {
          console.log(`There was error processing data.`);
          throw e.message;
      });
    } catch(e) {
      console.log(`There was error parsing data: ${e}`);
      json = null;
      errorCallback(e);
      throw e;
    }
    return json;
  }
  const existsIndata = function(rowData) {
    if (!data) return false;
    if (!rowData) return false;
    return data.filter(item => {
      return parseInt(item.id) === parseInt(rowData.id);
    }).length > 0;
  }
  const addDataRow = function(rowData) {
    if (!rowData || !rowData.id) return false;
    let newData = formatData(rowData);
    if (newData && !existsIndata(newData[0])) {
      setData([newData[0], ...data]);
    }
  }
  const handleExpiredSession = function() {
    sessionStorage.clear();
    setTimeout(() => {
      // / is a protected endpoint, the backend will request a new Access Token from Keycloak if able, else prompt a user to log in again
      window.location = "/";
    }, 0);
  }
  const handleSearch = function (event, rowData) {
    if (!rowData) {
      console.log("No valid data to perform patient search");
      return false;
    }
    setOpenLoadingModal(true);
    setErrorMessage('');
    const urls = [
      getPatientPMPSearchURL(rowData),
      "./validate_token"
    ];
    Promise.allSettled([
      fetch(urls[0], {...{"method": "PUT",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "body" : rowData.resource ? JSON.stringify(rowData.resource) : null
      }}, ...noCacheParam}),
      fetch(urls[1])
    ]).then(async([searchResult, tokenResult]) => {
      const searchResponse = searchResult.value;
      const tokenResponse = tokenResult.value;

      //fetch returns a simple flag of ok to indicate whether whether an HTTP response’s status code is in the successful range or not
      if (!searchResponse.ok) {
        //check if error response is text/html first
        let responseText = typeof searchResponse.text !== "undefined" ? (await searchResponse.text()) : "";
        if (!responseText) {
          //check if error response is in JSON
          responseText = typeof searchResponse.json !== "undefined" ? (await searchResponse.json()) : "";
        }
        throw (responseText ? responseText: searchResponse.statusText); //throw error so can be caught later
      }
      try {
        return [await searchResponse.json(), await tokenResponse.json()];
      } catch(e) {
        console.log("Error processing patient search and validating token ", e);
      }
      return false;

    }).then(results => {
      if (!results || !results.length) {
        setErrorMessage("Data processing error in [handleSearch]");
        toTop();
        setOpenLoadingModal(false);
        return false;
      }
      if (!results[1] ||
         (results[1] && (!results[1].valid || parseInt(results[1].access_expires_in) <= 0 || parseInt(results[1].refresh_expires_in) <= 0))) {
        //invalid token, force redirecting
        console.log("Redirecting...")
        handleExpiredSession();
        setOpenLoadingModal(true);
        return false;
      }
      let response = results[0];
      //response can be an array or just object now
      if (results[0] && results[0].entry && results[0].entry[0]) response = results[0].entry[0];
      if (!response) {
          setErrorMessage("<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>");
          toTop();
          setOpenLoadingModal(false);
          return false;
      }
      try {
        addDataRow(response);
      } catch(e) {
        console.log("Error occurred adding row to table ", e);
      }
      setErrorMessage('');
      let launchURL = "";
      let launchID = response.id;
      if (!launchID) {
        setErrorMessage("<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>");
        toTop();
        setOpenLoadingModal(false);
        return false;
      }
      try {
        launchURL = rowData.url || getLaunchURL(launchID);
      } catch(e) {
        setErrorMessage(`Unable to launch application.  Invalid launch URL. Missing configurations.`);
        toTop();
        setOpenLoadingModal(false);
        //log error to console
        console.log(`Launch URL error: ${e}`)
        return false;
      }
      if (!launchURL) {
        setErrorMessage(`Unable to launch application.  Missing launch URL. Missing configurations.`);
        toTop();
        setOpenLoadingModal(false);
        return false;
      }
      setTimeout(function() {
        sessionStorage.clear();
        window.location = launchURL;
      }, 50);
    }).catch(e => {
      let returnedError = e;
      try {
        returnedError = JSON.parse(e);
        returnedError = returnedError.message? returnedError.message: returnedError;
      } catch(e) {
        console.log("error parsing error message ", e);
      }
      setErrorMessage(`<p>COSRI is unable to return PMP information. This may be due to PMP system being down or a problem with the COSRI connection to PMP.</p><p>Error returned from the system: ${returnedError}</p>`);
      //log error to console
      console.log(`Patient search error: ${e}`);
      toTop();
      setOpenLoadingModal(false);
    });
  }
  const formatData = (data) => {
    if (!data) return false;
    if (!Array.isArray(data)) {
      data = [data];
    }
    return data && Array.isArray(data) ? data.map((item) => {
        let source = item.resource ? item.resource: item;
        let patientId = source && source["id"] ? source["id"] : "";
        return {
            first_name: source && source.name && source.name[0]? source.name[0]["given"][0] : "",
            last_name: source && source.name && source.name[0] ? source.name[0]["family"] : "",
            dob: source && source["birthDate"]? source["birthDate"]:"",
            url: getLaunchURL(patientId),
            identifier: source && source.identifier && source.identifier.length? source.identifier: null,
            lastUpdated: source && source.meta && source.meta.lastUpdated ? getLocalDateTimeString(source.meta.lastUpdated) : "",
            gender: source && source["gender"] ? source["gender"] : "",
            resource: source,
            id: patientId

        };
    }) : data;
  }

  //display body content when table is rendered
  function setVis() {
    document.querySelector("body").classList.add("ready");
  }

  function setNoPMPFlag(data) {
    if (!data || !data.length) return false;
    let hasNoPMPRow = data.filter(rowData => {
      return !inPDMP(rowData);
    }).length > 0;
    //legend will display if contain no pmp row flag is set
    if (hasNoPMPRow) setContainNoPMPRow(true);
  }

  function containEmptyFilter(filters) {
    if (!filters) return true;
    return filters.filter(item => {
      return !item.value;
    }).length > 0;
  }

  function setToolbarActionButtonVis(filters) {
    if (!document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} span`)) return;
    if (!containEmptyFilter(filters)) {
      document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} span`).innerText = document.querySelector(`#${NO_DATA_ELEMENT_ID}`) ? CREATE_BUTTON_LABEL: LAUNCH_BUTTON_LABEL;
      return;
    }
    document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} span`).innerText = LAUNCH_BUTTON_LABEL;
  }

  function setNoDataText(filters) {
    if (!document.querySelector(`#${NO_DATA_ELEMENT_ID}`)) return;
    let noDataText = "";
    if (filters && filters.length > 0 && containEmptyFilter(filters)) {
      noDataText = "Try entering all First name, Last name and Birth Date.";
    }
    if (!containEmptyFilter(filters)) {
      noDataText = `Click on ${CREATE_BUTTON_LABEL} button to create new patient`;
    }
    document.querySelector(`#${NO_DATA_ELEMENT_ID}`).innerText = noDataText;
  }

  function onFiltersDidChange(filters, clearAll) {
    clearTimeout(filterIntervalId);
    filterIntervalId = setTimeout(function() {
      setNoDataText(filters);
      setToolbarActionButtonVis(filters);
      if (filters && filters.length) {
        setCurrentFilters(filters);
        if (tableRef && tableRef.current) tableRef.current.onQueryChange();
        return filters;

      }
      else {
        if (clearAll) {
          setCurrentFilters(defaultFilters);
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
      rowData.identifier.filter(item => {
        return item.system === "https://github.com/uwcirg/script-fhir-facade"  && item.value === "found"
      }).length);
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
    setErrorMessage(isString(e) ? e : (e && e.message? e.message: "Error occurred processing data"));
  }

  const resetPaging = () => {
    setPageNumber(0);
    setPageSize(pageSize);
  }

  const handleRefresh = () => {
    document.querySelector("#btnClear").click();
  }

  const getPatientList = (query) => {
    let sortField = query.orderBy && query.orderBy.field? FieldNameMaps[query.orderBy.field] : "_lastUpdated";
    let sortDirection = query.orderDirection ? query.orderDirection : "desc";
    let sortMinus = sortDirection !== "asc" ? "-" : "";
    let filterBy = [];
    if (currentFilters && currentFilters.length) {
      currentFilters.forEach(item => {
        if (item.value) {
          filterBy.push(`${FieldNameMaps[item.field]}:contains=${item.value}`)
        }
      })
    }
    let searchString = filterBy.length ? filterBy.join("&") : "";
    let defaults  = {
      data: [],
      page: 0,
      totalCount: 0
    };
    const resetAll = () => {
      resetPaging();
      setVis();
      setInitialized(true);
    };
    let apiURL = `/fhir/Patient?_include=Patient:link&_total=accurate&_count=${pageSize}&_getpagesoffset=0`;
    if (searchString) {
      resetPaging();
    } else {
        if (pageNumber > prevPageNumber && nextPageURL) {
          apiURL = nextPageURL;
        } else if (prevPageNumber < pageNumber && prevPageURL) {
          apiURL = prevPageURL;
        }
    }
    if (searchString) apiURL += `&${searchString}`;
    if (sortField) apiURL += `&_sort=${sortMinus}${sortField}`;

     /*
      * get patient list
      */
      return new Promise((resolve, reject) => {
          fetchData(apiURL, noCacheParam, function(e) {
            resetAll();
            handleErrorCallback(e);
            resolve(defaults);
          }).then(response => {
            if (!response || !response.entry || !response.entry.length) {
              resetAll();
              resolve(defaults);
              return;
            }
            let responseData = formatData(response.entry);
            setData(responseData || []);
            setInitialized(true);
            setVis();
            setNoPMPFlag(responseData);
            let responsePageoffset = 0;
            let responseSelfLink = response.link? response.link.filter(item => {
              return item.relation === "self";
            }) : 0;
            let responseNextLink = response.link? response.link.filter(item => {
              return item.relation === "next";
            }) : 0;
            let responsePrevLink = response.link? response.link.filter(item => {
              return item.relation === "previous";
            }) : 0;
            if (responseSelfLink && responseSelfLink.length) {
              responsePageoffset = getUrlParameter("_getpagesoffset", new URL(responseSelfLink[0].url));
            }
            let currentPage = responsePageoffset ? (responsePageoffset / pageSize) : 0;
            let hasNextLink = responseNextLink && responseNextLink.length;
            let hasPrevLink = responsePrevLink && responsePrevLink.length;
            setNextPageURL(hasNextLink ? responseNextLink[0].url: "");
            setPrevPageURL(hasPrevLink ? responsePrevLink[0].url: "");
            setDisableNextButton(!hasNextLink);
            setDisablePrevButton(!hasPrevLink);
            resolve({
              data: responseData,
              page: currentPage,
              totalCount: response.total,
            });
        }).catch(error => {
          console.log("Failed to retrieve data", error);
          //unauthorized error
          handleErrorCallback(error);
          setErrorMessage(`Error retrieving data: ${error && error.status ? "Error status "+error.status: error}`);
          resetAll();
          resolve(defaults);
        });
      });
  };

  const handleChangePage = (event, newPage) => {
    setPrevPageNumber(pageNumber);
    setPageNumber(newPage);
    if ((newPage !== pageNumber) && tableRef && tableRef.current) tableRef.current.onQueryChange();
  };

  const handleChangeRowsPerPage = (event) => {
    setPageSize(parseInt(event.target.value, 10));
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };

  React.useEffect(() => {
    //when page unloads, remove loading indicator
    window.addEventListener("beforeunload", function() { setOpenLoadingModal(false); });
    fetchData("./settings", false, handleErrorCallback).then(response => {
        if (response) {
            setAppSettings(response);
        }
    }).catch(e => {
        //unauthorized error
        handleErrorCallback(error);
        setErrorMessage(`Error retrieving app setting: ${e}`);
    });
  }, []);

  return (
      <React.Fragment>
        <Container className={classes.container} id="patientList">
          <h2>COSRI Patient Search</h2>
          <Error message={errorMessage} style={errorStyle}/>
          <table className={classes.filterTable}>
            <tbody>
              <FilterRow
                onFiltersDidChange={onFiltersDidChange}
                launchFunc={handleSearch}
                launchButtonLabel={LAUNCH_BUTTON_LABEL}
                launchButtonId={TOOLBAR_ACTION_BUTTON_ID} />
            </tbody>
          </table>
          {<div className={classes.table} aria-label="patient list table" >
              <MaterialTable
                className={classes.table}
                columns={columns}
                data={
                  //any change in query will invoke this function
                  query => getPatientList(query)
                }
                tableRef={tableRef}
                hideSortIcon={false}
                options={{
                    paginationTypestepped: "stepped",
                    showFirstLastPageButtons: false,
                    pageSize: pageSize,
                    pageSizeOptions: [10, 20, 50],
                    paging: false,
                    padding: "dense",
                    emptyRowsWhenPaging: false,
                    debounceInterval:300,
                    toolbar: false,
                    filtering: false,
                    sorting: true,
                    search: false,
                    showTitle: false,
                    headerStyle: {
                        backgroundColor: theme.palette.primary.lightest,
                        padding: theme.spacing(1, 2, 1)
                    },
                    rowStyle: rowData => ({
                      backgroundColor: (!inPDMP(rowData) ? theme.palette.primary.disabled : '#FFF')
                    }),
                    actionsCellStyle: {
                      paddingLeft: theme.spacing(2),
                      paddingRight: theme.spacing(2),
                      minWidth: "20%",
                      justifyContent: "center"
                    },
                    actionsColumnIndex: -1
                }}
                icons={tableIcons}
                onRowClick={
                  (event, rowData) => {
                    event.stopPropagation();
                    handleSearch(event, rowData)
                  }
                }
                editable={{
                  onRowDelete: oldData =>
                    fetchData("/fhir/Patient/"+oldData.id, {method: "DELETE"}).then(response => {
                        setTimeout(() => {
                            const dataDelete = [...data];
                            const index = oldData.tableData.id;
                            dataDelete.splice(index, 1);
                            setData([...dataDelete]);
                            setErrorMessage("");
                        }, 500)
                     }).catch(e => {
                       setErrorMessage("Unable to remove patient from the list.");
                     })
                }}
                actions={[
                  rowData => ({
                      icon: () => (
                        <Tooltip title={!inPDMP(rowData)? 'Patient was not found in PMP. Launch COSRI Application for the user.': 'Launch COSRI application for the user'}><span className={classes.button} color="primary" fontSize="small" variant="contained">{LAUNCH_BUTTON_LABEL}</span></Tooltip>
                      ),
                      //tooltip: 'Launch COSRI application for the user',
                      onClick: (event, rowData) => {handleSearch(event, rowData);},
                      title: "",
                      position: "row",
                      align: "center"
                    })
                  ]}
                  localization={{
                    header: {
                      actions: ""
                    },
                  pagination: {
                    labelRowsSelect: "rows"
                  },
                  body: {
                      deleteTooltip: "Remove from the list",
                      editRow: {
                        deleteText: "Are you sure you want to remove this patient from the list? (You can add them back later by searching for them)",
                        saveTooltip: "OK",

                      },
                      emptyDataSourceMessage: (
                        <div id="emptyDataContainer" className={classes.flex}>
                            <div className={classes.warning}>
                              <div>No matching patient found.</div>
                              <div id={`${NO_DATA_ELEMENT_ID}`}></div>
                            </div>
                        </div>
                      ),
                  },
                }}
              />
          </div>}
          <div className={classes.flexContainer}>
            {
              patientListInitialized() &&
              containNoPMPRow &&
              <div className={classes.legend}>
                <span className={classes.legendIcon}></span> Not in PMP
              </div>
            }
             <div>
              {
                patientListInitialized() &&
                  <div>
                    <div className={classes.refreshButtonContainer}>
                      <Tooltip title="Refresh the list">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={handleRefresh}
                        >Refresh</Button>
                      </Tooltip>
                    </div>
                    <TablePagination
                      className={classes.pagination}
                      rowsPerPageOptions={[10, 20, 50]}
                      onChangePage={handleChangePage}
                      page={pageNumber}
                      rowsPerPage={pageSize}
                      onChangeRowsPerPage={handleChangeRowsPerPage}
                      count={-1}
                      component="div"
                      nextIconButtonProps={{
                        disabled: disableNextButton,
                        color: "primary"
                      }}
                      backIconButtonProps={{
                        disabled: disablePrevButton,
                        color: "primary"
                      }}
                      SelectProps={
                        {
                          variant: "outlined"
                        }
                      }
                    />
                  </div>
              }
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
            <div className={classes.paper} >
              <div className={classes.flex}>
                <span className={classes.loadingText}>Loading ...</span> <CircularProgress color="primary" />
              </div>
            </div>
          </Modal>
        </Container>
    </React.Fragment>
  );
}
