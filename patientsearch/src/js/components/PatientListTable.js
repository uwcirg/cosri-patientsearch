import React from 'react';
import DateFnsUtils from '@date-io/date-fns';
import isValid from "date-fns/isValid";
import { makeStyles} from '@material-ui/core/styles';
import { forwardRef } from 'react';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import CircularProgress from '@material-ui/core/CircularProgress';
import Container from '@material-ui/core/Container';
import MaterialTable from 'material-table';
import ClearIcon from '@material-ui/icons/Clear';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Search from '@material-ui/icons/Search';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import Tooltip from '@material-ui/core/Tooltip';
import Modal from '@material-ui/core/Modal';
import  {MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import Error from "./Error";
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: theme.spacing(2),
        marginTop: 148
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
      color: "#bb812a",
      marginTop: theme.spacing(3),
      lineHeight: 1.7
    }
});

const tableIcons = {
  Filter: forwardRef((props, ref) => <Search {...props} ref={ref} color="primary" />),
  FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
  LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
  NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  PreviousPage: forwardRef((props, ref) => <ChevronLeft {...props} ref={ref} />),
  SortArrow: forwardRef((props, ref) => <ArrowDownward {...props} ref={ref} color="primary" />),
};

let initIntervalId = 0;
let appSettings = {};
const NUM_OF_REQUIRED_FILTERS = 3;

export default function PatientListTable(props) {
  const classes = useStyles();
  const [initialized, setInitialized] = React.useState(false);
  const [data, setData] = React.useState([]);
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [toolbarActionButtonAdded, setToolbarActionButton] = React.useState(false);
  const tableRef = React.useRef();
  const LAUNCH_BUTTON_LABEL = "VIEW";
  const CREATE_BUTTON_LABEL = "CREATE";
  const NO_DATA_ELEMENT_ID = "noDataContainer";
  const TOOLBAR_ACTION_BUTTON_ID = "toolbarGoButton";
  const CACHE_FILTERS_LABEL = "cosri_filters";
  const firstNameFilter = "";
  const columns = [
    {field: "id", hidden: true, defaultSort: "desc", filtering: false},
    {title: "First Name", field: "first_name", filterPlaceholder: "First Name", emptyValue: "--", defaultFilter: firstNameFilter},
    {title: "Last Name", field: "last_name", filterPlaceholder: "Last Name", emptyValue: "--"},
    {title: "Birth Date", field: "dob", filterPlaceholder: "YYYY-MM-DD", emptyValue: "--",
    filterComponent: (props) => <CustomDatePicker {...props} />,
    },
  ];
  const errorStyle = {"display" : errorMessage? "block": "none"};
  const setAppSettings = function(settings) {
    appSettings = settings;
  }
  const getPatientSearchURL = (data) => {
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
    if (!baseURL || !iss) return "";
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
  const handleSearch = function (event, rowData) {
    if (!rowData) {
      console.log("No valid data to perform patient search");
      return false;
    }
    setOpenLoadingModal(true);
    setErrorMessage('');
    fetchData(getPatientSearchURL(rowData), {...{"method": "PUT"}, ...noCacheParam}).then(response => {
      if (!response || !response.entry || !response.entry.length) {
          setErrorMessage("<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>");
          setOpenLoadingModal(false);
          return false;
      }
      setErrorMessage('');
      setOpenLoadingModal(false);
      let launchURL = "";
      try {
        launchURL = rowData.url || getLaunchURL(response.entry[0].id);
      } catch(e) {
        setErrorMessage(`Unable to launch application.  Invalid launch URL. Missing configurations.`);
        //log error to console
        console.log(`Launch URL error: ${e}`)
        return false;
      }
      if (!launchURL) {
        setErrorMessage(`Unable to launch application.  Invalid launch URL. Missing configurations.`);
        return false;
      }
      setTimeout(function() {
        window.location = launchURL;
      }, 150);
    }).catch(e => {
      setErrorMessage("COSRI is unable to return PMP information. This may be due to PMP system being down or a problem with the COSRI connection to PMP.");
      //log error to console
      console.log(`Patient search error: ${e}`);
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

  const getFilterRowData = function() {
    let filterItems = sessionStorage.getItem(CACHE_FILTERS_LABEL);
    if (filterItems) {
      filterItems = JSON.parse(filterItems);
    }
    if (!filterItems || !filterItems.length) return false;
    let o = {};
    filterItems.forEach(item => {
      o[item.column.field] = item.value;
    });
    return o;
  }

  function setToolbarActionButtonVis(filters) {
    console.log("filters ", filters)
    if (filters && filters.length >= NUM_OF_REQUIRED_FILTERS) {
      document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button`).removeAttribute("disabled");
      document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button`).classList.remove("disabled");
      document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button span`).innerText = document.querySelector(`#${NO_DATA_ELEMENT_ID}`) ? CREATE_BUTTON_LABEL: LAUNCH_BUTTON_LABEL;
      return;
    }
    document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button`).setAttribute("disabled", true);
    document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button`).classList.add("disabled");
    if (!document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button span`)) return;
    document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button span`).innerText = LAUNCH_BUTTON_LABEL;
  }

  function getToolbarActionButton() {
      var btn = document.getElementById(`${TOOLBAR_ACTION_BUTTON_ID}`);
      if (!btn) return;
      if (toolbarActionButtonAdded) return;
      var cln = btn.cloneNode(true);
      var parent = document.querySelector("#patientList table");
      if (parent && parent.querySelector("tr td:last-of-type")) {
        let cld = parent.querySelector("tr td:last-of-type").appendChild(cln);
        cld.classList.remove("hide");
        setTimeout(function() {
          document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID}`).addEventListener("click", function(e) {
            handleSearch(e, getFilterRowData())
          });
          setToolbarActionButton(true);
        }, 250);
        if (btn) btn.remove();
        setToolbarActionButtonVis();
        clearInterval(initIntervalId);
      }
  }

  function setVis() {
    document.querySelector("body").classList.add("ready");
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
      sessionStorage.setItem(CACHE_FILTERS_LABEL, JSON.stringify(filters));
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

  React.useEffect(() => {
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
          setData(formatData(response));
          setInitialized(true);
          setLoading(false);
          setVis();
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

  React.useEffect(() => {
    initIntervalId = setInterval(function() {
      getToolbarActionButton();
    }, 50);
  }, [toolbarActionButtonAdded]);

  const CustomDatePicker = (props) => {
    const [date, setDate] = React.useState(null);
    const [input, setInput] = React.useState("");
    return (
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <KeyboardDatePicker
              className={classes.datePickerContainer}
              autoOk={true}
              variant="dialog"
              openTo="year"
              disableFuture
              InputProps={{
                startAdornment: (
                  <InputAdornment position="end" style={{order: 1, marginLeft: 0}}>
                      <IconButton onClick={() => { setDate(null); setInput(""); }} disabled={!input} style={{order: 2, padding: 0}} aria-label="Clear date" title="Clear date">
                          <ClearIcon color={!input ? "disabled" : "primary"} fontSize="small" />
                      </IconButton>
                  </InputAdornment>
                )
               }}
              format="yyyy-MM-dd"
              id="birthDate"
              minDate={new Date("1900-01-01")}
              invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
              disableFuture
              placeholder="YYYY-MM-DD"
              value={date}
              orientation="landscape"
              onChange={(event, dateString) => {
                setInput(dateString);
                if (!event || !isValid(event)) {
                    if (event && ((String(input).replace(/[-_]/g, '').length) >= 8)) setDate(event);
                    props.onFilterChanged(props.columnDef.tableData.id, null);
                    return;
                }
                setDate(event);
                props.onFilterChanged(props.columnDef.tableData.id, dateString);
              }}
              KeyboardButtonProps={{color: "primary", title: "Date picker"}}

          />
      </MuiPickersUtilsProvider>
    );
  }

  return (
      <React.Fragment>
        <Container className={classes.container} id="patientList" maxWidth="lg">
          <h2>COSRI Patient Search</h2>
          <Error message={errorMessage} style={errorStyle}/>
          {loading && <CircularProgress size={40} className={classes.buttonProgress} />}
          {!loading && initialized && <div className={classes.table} aria-label="patient list table" >
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
                actions={[
                  rowData => ({
                      icon: () => (
                        <Tooltip title={!inPDMP(rowData)? 'Patient was not found in PMP. Launch COSRI Application for the user.': 'Launch COSRI application for the user'}><span className={classes.button} color="primary" fontSize="small" variant="contained">{LAUNCH_BUTTON_LABEL}</span></Tooltip>
                      ),
                      //tooltip: 'Launch COSRI application for the user',
                      onClick: (event, rowData) => {handleSearch(event, rowData);},
                      title: "",
                      position: "row"
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
          {/* toolbar go button */}
          <div id={`${TOOLBAR_ACTION_BUTTON_ID}`} className="hide"><Button  className="disabled" color="primary" size="small" variant="contained" className={classes.button}>{LAUNCH_BUTTON_LABEL}</Button></div>
        </Container>
    </React.Fragment>
  );
}
