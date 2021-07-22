import React from 'react';
import { forwardRef } from 'react';
import { makeStyles} from '@material-ui/core/styles';
import MaterialTable from 'material-table';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import Check from '@material-ui/icons/Check';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import ClearIcon from '@material-ui/icons/Clear';
import CircularProgress from '@material-ui/core/CircularProgress';
import Container from '@material-ui/core/Container';
import Delete from '@material-ui/icons/Delete';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Search from '@material-ui/icons/Search';
import Tooltip from '@material-ui/core/Tooltip';
import Modal from '@material-ui/core/Modal';
import Error from "./Error";
import FilterRow from "./FilterRow";
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: theme.spacing(2),
        marginTop: 148,
        maxWidth: "1080px"
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
      lineHeight: 1.7
    },
    success: {
      fill: theme.palette.primary.success
    },
    muted: {
      fill: theme.palette.muted.main
    },
    legend: {
      marginTop: theme.spacing(2),
      float: "left"
    },
    legendIcon: {
      backgroundColor: theme.palette.primary.disabled,
      width: theme.spacing(6),
      height: theme.spacing(3),
      marginRight: theme.spacing(0.5),
      display: "inline-block",
      verticalAlign: "bottom"
    }
});

let appSettings = {};
const NUM_OF_REQUIRED_FILTERS = 3;

export default function PatientListTable(props) {
  const classes = useStyles();
  const [initialized, setInitialized] = React.useState(false);
  const [data, setData] = React.useState([]);
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [containNoPMPRow, setContainNoPMPRow] = React.useState(false);
  const tableRef = React.useRef();
  const LAUNCH_BUTTON_LABEL = "VIEW";
  const CREATE_BUTTON_LABEL = "CREATE";
  const NO_DATA_ELEMENT_ID = "noDataContainer";
  const TOOLBAR_ACTION_BUTTON_ID = "toolbarGoButton";
  const firstNameFilter = "";
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
  const columns = [
    //default sort by id in descending order
    {field: "id", hidden: true, defaultSort: "desc", filtering: false, customSort: (a,b) => parseInt(a["id"])<parseInt(b["id"])?-1:1},
    {title: "First Name", field: "first_name", filterPlaceholder: "First Name", emptyValue: "--", defaultFilter: firstNameFilter},
    {title: "Last Name", field: "last_name", filterPlaceholder: "Last Name", emptyValue: "--"},
    {title: "Birth Date", field: "dob", filterPlaceholder: "YYYY-MM-DD", emptyValue: "--",
    },
  ];
  const errorStyle = {"display" : errorMessage? "block": "none"};
  const toTop = () => {
    window.scrollTo(0, 0);
  }
  const setAppSettings = function(settings) {
    appSettings = settings;
  }
  const getPatientHapiSearchURL = (data) => {
    const dataURL = "/Patient";
    const params = [
      `given=${data.first_name}`,
      `family=${data.last_name}`,
      `birthdate=${data.dob}`
    ];
    return `${dataURL}?${params.join("&")}`;
  }
  const getPatientPMPSearchURL = (data) => {
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

  async function fetchData(url, params) {
    const MAX_WAIT_TIME = 10000;
    params = params || {};
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
    let results = await Promise.race([
      fetch(url, params),
      timeoutPromise
    ]).catch(e => {
        throw `There was error fetching data: ${e}`;
    });

    let json = null;
    if (results) {
      try {
        //read response stream
        json = await (results.json()).catch(e => {
            console.log(`There was error processing data: ${e.message}`);
            throw e.message;
        });
      } catch(e) {
        console.log(`There was error parsing data: ${e}`);
        json = null;
        throw e;
      }
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
    if (!rowData) return false;
    //check if it is added in HAPI FHIR server?
    //add new row to table if it does not exists in table already
    fetchData(getPatientHapiSearchURL(rowData, noCacheParam)).then(hapiResult => {
      if (hapiResult && hapiResult.entry && hapiResult.entry.length) {
        let newData = formatData(hapiResult);
        if (newData && !existsIndata(newData[0])) {
          setData([newData[0], ...data]);
        }
      }
    });
  }
  const handleLogout = function() {
    sessionStorage.clear();
    setTimeout(() => {
      window.location = "/logout";
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
        "Content-Type": "application/json"
      }}, ...noCacheParam}),
      fetch(urls[1])
    ]).then(async([searchResult, tokenResult]) => {
      const searchResponse = searchResult.value;
      const tokenResponse = tokenResult.value;

      if (searchResponse.status === 500) {
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
      if (!results[1] || (results[1] && !results[1].valid)) {
        //invalid token, force logout
        console.log("Logging out...")
        handleLogout();
        setOpenLoadingModal(true);
        return false;
      }
      let response = results[0];

      if (!response || !response.entry || !response.entry.length) {
          //NOT IN PMP BUT IN HAPI? need to check
          try {
            addDataRow(rowData);
          } catch(e) {
            console.log("Error occurred adding row to table ", e);
          }
          setErrorMessage("<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>");
          toTop();
          setOpenLoadingModal(false);
          return false;
      }
      setErrorMessage('');
      let launchURL = "";
      try {
        launchURL = rowData.url || getLaunchURL(response.entry[0].id);
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
      setErrorMessage(`<p>COSRI is unable to return PMP information. This may be due to PMP system being down or a problem with the COSRI connection to PMP.</p><p>Error returned from the system: ${e}</p>`);
      //log error to console
      console.log(`Patient search error: ${e}`);
      toTop();
      setOpenLoadingModal(false);
    });
  }
  const formatData = (data) => {
    if (!data) return false;
    return data.entry.map((item) => {
        let patientId = item.resource && item.resource["id"] ? item.resource["id"] : "";
        return {
            first_name: item.resource && item.resource.name && item.resource.name[0]? item.resource.name[0]["given"][0] : "",
            last_name: item.resource && item.resource.name && item.resource.name[0] ? item.resource.name[0]["family"] : "",
            dob: item.resource && item.resource["birthDate"]?
              item.resource["birthDate"]:
              "",
            url: getLaunchURL(patientId),
            identifier: item.resource && item.resource.identifier && item.resource.identifier.length? item.resource.identifier: null,
            gender: item.resource && item.resource["gender"] ? item.resource["gender"] : "",
            id: patientId

        };
    });
  }

  function setToolbarActionButtonVis(filters) {
    if (!document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} span`)) return;
    if (filters && filters.length >= NUM_OF_REQUIRED_FILTERS) {
      document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} span`).innerText = document.querySelector(`#${NO_DATA_ELEMENT_ID}`) ? CREATE_BUTTON_LABEL: LAUNCH_BUTTON_LABEL;
      return;
    }
    document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} span`).innerText = LAUNCH_BUTTON_LABEL;
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

  function setNoDataText(filters) {
    if (!document.querySelector(`#${NO_DATA_ELEMENT_ID}`)) return;
    let noDataText = "";
    if (!filters || filters.length < NUM_OF_REQUIRED_FILTERS) {
      noDataText = "Try entering all First name, Last name and Birth Date.";
    } else
      noDataText = `Click on ${CREATE_BUTTON_LABEL} button to create new patient`;
    document.querySelector(`#${NO_DATA_ELEMENT_ID}`).innerText = noDataText;
  }

  function onFiltersDidChange(filters) {
    setTimeout(function() {
      setNoDataText(filters);
      setToolbarActionButtonVis(filters);
    }, 0);
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
    return !loading && initialized;
  }

  React.useEffect(() => {
    //when page unloads, remove loading indicator
    window.addEventListener("beforeunload", function() { setOpenLoadingModal(false); });
    fetchData("./settings").then(response => {
        if (response) {
            setAppSettings(response);
        }
        /*
        * get patient list
        */
        fetchData("./Patient", noCacheParam).then(response => {
          if (!response || !response.entry || !response.entry.length) {
            setInitialized(true);
            setLoading(false);
            return;
          }
          let responseData = formatData(response);
          setData(responseData);
          setInitialized(true);
          setLoading(false);
          setVis();
          setNoPMPFlag(responseData);
        }).catch(error => {
          console.log("Failed to retrieve data", error.statusText);
          setErrorMessage(`Error retrieving data: ${error.statusText}`);
          setInitialized(true);
          setLoading(false);
        });
    }).catch(e => {
        setErrorMessage(`Error retrieving app setting: ${e}`);
        setLoading(false);
    });
  }, []);

  return (
      <React.Fragment>
        <Container className={classes.container} id="patientList">
          <h2>COSRI Patient Search</h2>
          <Error message={errorMessage} style={errorStyle}/>
          {loading && <CircularProgress size={40} className={classes.buttonProgress} />}
          {patientListInitialized() && <div className={classes.table} aria-label="patient list table" >
              <MaterialTable
                className={classes.table}
                columns={columns}
                data={data}
                tableRef={tableRef}
                hideSortIcon={false}
                options={{
                    paginationTypestepped: "stepped",
                    toolbar: false,
                    filtering: true,
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
                onFilterChange={
                  function(event) {
                    onFiltersDidChange(event);
                    return false;
                  }
                }
                components={{
                  FilterRow: props => <FilterRow {...props} launchFunc={handleSearch} launchButtonLabel={LAUNCH_BUTTON_LABEL} launchButtonId={TOOLBAR_ACTION_BUTTON_ID}/>
                }}
                editable={{
                  onRowDelete: oldData =>
                    fetchData("/Patient/"+oldData.id, {method: "DELETE"}).then(response => {
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
                        <div className={classes.flex}>
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
          {patientListInitialized() && containNoPMPRow && <div className={classes.legend}>
            <span className={classes.legendIcon}></span> Not in PMP
          </div>}
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
