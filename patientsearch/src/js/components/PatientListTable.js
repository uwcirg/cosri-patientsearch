import React from 'react';
import { makeStyles, MuiThemeProvider } from '@material-ui/core/styles';
import { forwardRef } from 'react';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import CircularProgress from '@material-ui/core/CircularProgress';
import Container from '@material-ui/core/Container';
import MaterialTable from 'material-table';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Search from '@material-ui/icons/Search';
import Button from '@material-ui/core/Button';
import Modal from '@material-ui/core/Modal';
import MuiAlert from '@material-ui/lab/Alert';
import Snackbar from '@material-ui/core/Snackbar';
import Error from "./Error";
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        marginLeft: "auto",
        marginRight: "auto",
        marginBottom: theme.spacing(4),
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
    resultTable: {
      marginRight: theme.spacing(4),
      textAlign: "left"
    },
    resultItem: {
      marginBottom: theme.spacing(1)
    },
    label: {
      marginRight: theme.spacing(1.5)
    },
    button: {
      background: theme.palette.primary.main,
      color: "#FFF",
      padding: theme.spacing(1, 2, 1),
      fontSize: "14px",
      borderRadius: "4px",
      width: "120px",
      fontWeight: 500,
      textTransform: "uppercase"
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

export default function PatientListTable(props) {
  const classes = useStyles();
  const [initialized, setInitialized] = React.useState(false);
  const [data, setData] = React.useState([]);
  const [openLoadingModal, setOpenLoadingModal] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [popOpen, setPop] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [appSettings, setAppSettings] = React.useState();
  const [filters, setFilters] = React.useState([]);
  const [toolbarActionButtonAdded, setToolbarActionButton] = React.useState(false);
  const tableRef = React.createRef();
  const LAUNCH_BUTTON_LABEL = "GO";
  const TOOLBAR_ACTION_BUTTON_ID = "toolbarGoButton";
  const columns = [
    {title: "First Name", field: "first_name", filterPlaceholder: "First Name", emptyValue: "--"},
    {title: "Last Name", field: "last_name", filterPlaceholder: "Last Name", emptyValue: "--"},
    {title: "Birth Date", field: "dob", filterPlaceholder: "YYYY-MM-DD", emptyValue: "--"},
  ];
  const errorStyle = {"display" : errorMessage? "block": "none"};
  const getPatientSearchURL = (data) => {
    const dataURL = "/external_search/Patient";
    const params = [
          `subject:Patient.name.given=${data.first_name}`,
          `subject:Patient.name.family=${data.last_name}`,
          `subject:Patient.birthdate=eq${data.dob}`
      ];
      return `${dataURL}?${params.join("&")}`;
  };
  const getLaunchURL = (patientId) => {
    if (!patientId) {
        console.log("Missing information: patient Id");
        return "";
    }
    let baseURL = appSettings["SOF_CLIENT_LAUNCH_URL"];
    let iss = appSettings["SOF_HOST_FHIR_URL"];
    let launchParam = btoa(JSON.stringify({"b":patientId}));
    return `${baseURL}?launch=${launchParam}&iss=${iss}`;
  };

  async function fetchData(url) {
    const MAX_WAIT_TIME = 10000;
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
      fetch(url),
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
  /*
  * close snackbar
  */
  const handlePopClose = (event, reason) => {
    if (reason === 'clickaway') {
        return;
    }
    setPop(false);
  }
  const handleSearch = (event, rowData) => {
    setOpenLoadingModal(true);
    setErrorMessage('');
    fetchData(getPatientSearchURL(rowData)).then(response => {
      console.log("response from search ", response)
      if (!response || !response.entry || !response.entry.length) {
          setErrorMessage("No patient found.");
          setOpenLoadingModal(false);
          return;
      }
      setErrorMessage('');
      setOpenLoadingModal(false);
      setTimeout(function() {
        window.location = getLaunchURL(rowData.id || response.entry[0].id)
      }, 150);
    }).catch(e => {
        setErrorMessage(`Patient search error: ${e}`);
        setOpenLoadingModal(false);
        setPop(true);
    });
  }
  const formatData = (data) => {
    if (!data) return false;
    return data.entry.map((item) => {
        return {
            first_name: item.resource && item.resource.name && item.resource.name[0]? item.resource.name[0]["given"][0] : "",
            last_name: item.resource && item.resource.name && item.resource.name[0] ? item.resource.name[0]["family"] : "",
            dob: item.resource && item.resource["birthDate"]?
              item.resource["birthDate"]:
              "",
            url: "",
            gender: item.resource && item.resource["gender"] ? item.resource["gender"] : "",
            id: item.resource && item.resource["id"] ? item.resource["id"] : ""
        };
    });
  }
  const getFilterRowData = (filters) => {
    let o = {};
    filters.forEach(item => {
      o[item.column.field] = item.value;
    });
    return o;
  }

  function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
  }

  function setToolbarActionButtonVis() {
    if (filters.length >= 3) {
      document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button`).setAttribute("disabled", false);
      document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button`).classList.remove("disabled");
      return;
    }
    document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button`).setAttribute("disabled", true);
    document.querySelector(`#${TOOLBAR_ACTION_BUTTON_ID} button`).classList.add("disabled");
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
        cld.addEventListener("click", (e) => handleSearch(e, getFilterRowData(filters)));
        btn.remove();
        setToolbarActionButton(true);
        setToolbarActionButtonVis();
      }
  }

  React.useEffect(() => {
    fetchData("./settings").then(response => {
        if (response) {
            setAppSettings(response);
        }
        /*
        * get patient list
        */
        fetchData("./Patient").then(response => {
          if (!response || !response.entry || !response.entry.length) {
            setInitialized(true);
            setErrorMessage("No data found");
            setLoading(false);
            return;
          }
          setData(formatData(response));
          setInitialized(true);
          getToolbarActionButton();
          setLoading(false);
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
    setTimeout(getToolbarActionButton, 1000);
  }, [toolbarActionButtonAdded]);

  return (
      <React.Fragment>
        <Container className={classes.container} id="patientList" maxWidth="lg">
          {loading && <CircularProgress size={32} className={classes.buttonProgress} />}
          {!loading && initialized && <div className={classes.table} aria-label="patient list table" >
              <h2>Patient Search</h2>
              <MuiThemeProvider theme={theme}>
                  <MaterialTable
                    className={classes.table}
                    columns={columns}
                    data={data}
                    tableRef={tableRef}
                    options={{
                        toolbar: false,
                        filtering: true,
                        sorting: true,
                        search: false,
                        showTitle: false,
                        headerStyle: {
                            backgroundColor: theme.palette.primary.lightest
                        },
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
                        handleSearch(event, rowData)
                      }
                    }
                    onFilterChange={
                      (event) => {
                        setErrorMessage("");
                        setFilters(event);
                        setToolbarActionButtonVis();
                      }
                    }
                    actions={[
                      () => ({
                          icon: () => <span className={classes.button}>{LAUNCH_BUTTON_LABEL}</span>,
                          tooltip: 'Launch COSRI application for the user',
                          onClick: (event, rowData) => {
                            handleSearch(event, rowData)
                          },
                          title: "",
                          position: "row"
                        })
                      ]}
                      localization={{
                        header: {
                          actions: ""
                        },
                      pagination: {
                        labelRowsSelect: "rows to show"
                      },
                      body: {
                          emptyDataSourceMessage: (
                            <div className={classes.flex}>
                                <div className={classes.warning}>
                                  No matching patient found.<br/>
                                  Try entering all First name, Last name and Birth Date.
                                </div>
                            </div>
                          ),
                      },
                    }}
                  />
              </MuiThemeProvider>
          </div>}
          <Snackbar open={popOpen} autoHideDuration={1500} onClose={handlePopClose} anchorOrigin={{vertical: 'top', horizontal: 'center' }}>
              <Alert onClose={handlePopClose} severity="error">Error occurred launching COSRI</Alert>
          </Snackbar>
          <Error message={errorMessage} style={errorStyle}/>
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
          <div id={`${TOOLBAR_ACTION_BUTTON_ID}`} className="hide"><Button  className="disabled" color="primary" size="small" variant="contained" onClick={(e) => handleSearch(e, getFilterRowData(filters))} className={classes.button}>{LAUNCH_BUTTON_LABEL}</Button></div>
        </Container>
    </React.Fragment>
  );
}
