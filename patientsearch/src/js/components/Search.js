import format from "date-fns/format";
import isValid from "date-fns/isValid";
import DateFnsUtils from '@date-io/date-fns';
import clsx from 'clsx';
import React, {useReducer} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Backdrop from '@material-ui/core/Backdrop';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Container from '@material-ui/core/Container';
import { green } from '@material-ui/core/colors';
import Fade from '@material-ui/core/Fade';
import Grid from '@material-ui/core/Grid';
import  {MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import Link from '@material-ui/core/Link';
import Modal from '@material-ui/core/Modal';
import MuiAlert from '@material-ui/lab/Alert';
import Snackbar from '@material-ui/core/Snackbar';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ResultTable from "./ResultTable";
import Error from "./Error";
import PatientViewer from "./PatientViewer";
import Spinner from "./Spinner";
import {sendRequest} from './Utility';


const useStyles = makeStyles((theme) => ({
    root: {
        marginTop: theme.spacing(3),
        display: 'flex',
        paddingRight: theme.spacing(2),
        paddingLeft: theme.spacing(2)
    },
    ready: {
        opacity: 1,
    },
    notReady: {
        opacity: 0,
    },
    appBarSpacer: theme.mixins.toolbar,
    content: {
        flexGrow: 1,
        overflow: 'auto',
    },
    container: {
        paddingTop: theme.spacing(1),
        paddingBottom: theme.spacing(3),
        paddingLeft: theme.spacing(4),
        paddingRight: theme.spacing(4),
        maxWidth: 520
    },
    paper: {
        marginTop: theme.spacing(8),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    form: {
        width: '100%', // Fix IE 11 issue.
        marginTop: theme.spacing(1),
    },
    avatar: {
        marginLeft: theme.spacing(1)
    },
    modal: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
    datePickerContainer: {
        marginTop: theme.spacing(3),
        width: "100%"
    },
    titleHeader: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderBottom: `3px solid ${theme.palette.primary.main}`,
        marginBottom: theme.spacing(2),
        marginTop: theme.spacing(1),
        paddingBottom: theme.spacing(0.25),
    },
    divider: {
        marginTop: theme.spacing(2)
    },
    link: {
        textDecoration: "underline",
        cursor: "pointer"
    },
    linkDisabled: {
        textDecoration: "underline",
        cursor: "auto",
        color: "#777"
    },
    modal: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalBody: {
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[4],
        padding: theme.spacing(2, 4, 3),
        border: 0
    },
    formOpen: {
        opacity: 1,
        transition: theme.transitions.create(['transform', 'opacity'], {
            easing: theme.transitions.easing.sharp,
            duration: 150
        })
    },
    formClose: {
        opacity: 0,
        transition: theme.transitions.create(['transform', 'opacity'], {
            easing: theme.transitions.easing.slow,
            duration: 850,
        })
    },
    modalButtonContainer: {
        marginTop: theme.spacing(2.5)
    },
    wrapper: {
        margin: theme.spacing(1, 0, 0),
        position: 'relative',
        width: "100%"
    },
    buttonProgress: {
        color: theme.palette.primary.main,
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -8,
        marginLeft: -12,
    },
    buttonSuccess: {
        backgroundColor: green[500],
        '&:hover': {
          backgroundColor: green[700],
        },
    },
    snackbarWrapper: {
        bottom: "15%",
    },
    snackbarContent: {
        backgroundColor: green[500],
        color: "#FFF",
        display: "flex",
        justifyContent: "center",
        minWidth: "160px",
        maxWidth: "160px"
    },
    view: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        background: theme.palette.primary.base
       
    },
    viewOpen: {
        transform: "scaleX(1)",
        transformOrigin: "top left",
        zIndex: 999,
        opacity: 1,
        transition: theme.transitions.create(['transform', 'opacity'], {
            easing: theme.transitions.easing.slow,
            duration: 700,
            delay: 150
        })
    },
    viewClose: {
        transform: "scaleX(0.9)",
        opacity: 0,
        zIndex: -1,
        transition: theme.transitions.create(['transform', 'opacity'], {
            easing: theme.transitions.easing.sharp,
            duration: 350,
        })
    }
}));

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

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export default function Search() {
    let focusInput = React.useRef(null);
    const reducer = (state, action) => {
        return {
            appReady: {...state, appReady: true, loading: false},
            appSettings: {...state, appSettings: action.settings, appReady: true, loading: false},
            dob: {...state, dob: action.dob, errorMessage: ""},
            error: {...state, success: false, loading: false, errorMessage: action.errorMessage},
            firstName: {...state, firstName: action.firstName, errorMessage: ""},
            lastName: {...state, lastName: action.lastName, errorMessage: ""},
            loading: {...state, loading: true, errorMessage: ""},
            popClose: {...state,loading: false, popOpen: false},
            popOpen: {...state, loading: false, popOpen: true},
            resultClose: {...state, resultOpen: false, success: false},
            reset: {...state, firstName: "", lastName: "", dob: null, errorMessage: "", success: false, searchResults: [], currentLaunchURL: ""},
            resultOpen: {...state, resultOpen: true},
            success: {...state, searchResults: action.searchResults, success: true, loading: false, errorMessage: "", popOpen: true},
            viewOpen: {...state, loading: false, viewOpen: true, resultOpen: false, currentLaunchURL: action.currentLaunchURL}

        }[action.type];
    };
    const initialState = {
        appReady: false,
        appSettings: null,
        loading: false,
        errorMessage: "",
        popOpen: false,
        resultOpen: false,
        firstName: "",
        lastName: "",
        dob: null,
        success: false,
        viewOpen: false,
        searchResults: [],
        currentLaunchURL: ""
    };
    const [state, dispatch] = useReducer(reducer, initialState);
    const classes = useStyles();
    const rootClass = clsx(classes.root, {
        [classes.ready]: state.appReady,
        [classes.notReady]: !state.appReady
    });
    const buttonClassname = clsx({
        [classes.buttonSuccess]: state.success,
    });
    const patientViewClass = clsx(classes.view, {
        [classes.viewOpen]: state.viewOpen,
        [classes.viewClose]: !state.viewOpen
    });
    const formClass = clsx(classes.form, {
        [classes.formClose]: state.viewOpen
    });
    const spinnerClass = clsx({
       "hide": state.appReady,
       "show": !state.appReady
    });

    const getLaunchURL = (patientId) => {
        if (!patientId) {
            console.log("Missing information: patient Id");
        }
        let baseURL = state.appSettings["SOF_CLIENT_LAUNCH_URL"];
        let iss = state.appSettings["SOF_HOST_FHIR_URL"];
        let launchParam = btoa(JSON.stringify({"b":patientId}));
        return `${baseURL}?launch=${launchParam}&iss=${iss}`; 
    }
 
    const getPatientSearchURL = () => {
        const dataURL = "/external_search/Patient";
        let formattedDate = format(new Date(state.dob), "yyyy-MM-dd");
        const params = [
            `subject:Patient.name.given=${state.firstName}`,
            `subject:Patient.name.family=${state.lastName}`,
            `subject:Patient.birthdate=eq${formattedDate}`
        ];
        return `${dataURL}?${params.join("&")}`;
    };
    const searchPatient = () => {
        dispatch({type: "loading"});
        fetchData(getPatientSearchURL()).then(response => {
            if (!response || !response.entry || !response.entry.length) {
                dispatch({type: "error", errorMessage: "No patient found."});
                return;
            }
            let formattedResult = response.entry;
            formattedResult = formattedResult.map(item => {
                let fullName = "";
                if (item.name) {
                    if (item.name.given) fullName += item.name.given;
                    if (item.name.family) fullName += (fullName ? " ": "") + item.name.family;
                }
                item.fullName = fullName;
                item.launchURL = encodeURI(getLaunchURL(item.id));
                return item;
            });
            dispatch({type: "success", searchResults: formattedResult});
            setTimeout(function() {
                dispatch({type: "resultOpen", resultOpen: true});
            }, 500);
          
        
        }).catch(e => {
            dispatch({type: "error", errorMessage: `Patient search error: ${e}`});
        });
    };
    const handleDateChange = (date) => {
        let convoDate = new Date(date);
        if (!isValid(convoDate)) {
            return;
        }
        dispatch({type: "dob", dob: date});
    };

    const handleKeyEvent = (e) => {
        if (!e.target.value) {
            return;
        }
        if (e.keyCode === 13) { //enter key pressed
            if (isRequiredFullfilled()) {
                searchPatient();
            }
        }
    }

    const handleFirstNameChange = (event) => {
        dispatch({type:"firstName", firstName: event.target.value});
    }
    const handleLastNameChange = (event) => {
        dispatch({type: "lastName", lastName: event.target.value});
    }

    const handlePopClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
       dispatch({type: "popClose"});
    }

    const handleViewOpen = (launchURL) => {
        dispatch({type: "viewOpen", currentLaunchURL: launchURL});
    }

    const handleResultClose = () => {
        dispatch({type: "resultClose"});
    };

    const isRequiredFullfilled = () => {
        return state.firstName && state.lastName && state.dob;
    }

    const isAnyFullfilled = () => {
        return state.firstName || state.lastName || state.dob;
    }
    
    const reset = () => {
        dispatch({type: "reset"});
        setTimeout(() => {
            focusInput.current.focus();
        }, 150);
    }

    const resetFields = (event) => {
        event.preventDefault();
        if (!isAnyFullfilled()) {
            return false;
        }
        reset();
    }
    let errorStyle = {
        "display" : state.errorMessage? "block": "none"
    };

    React.useEffect(() => {
        /*
         * get app settings
         */
        sendRequest("./settings").then(response => {
            let settings = null
            try {
                settings = JSON.parse(response);
            } catch(e) {
                console.log("error parsing data ", e);
            }
            if (settings) {
                dispatch({type: "appSettings", settings: settings});
                return;
            }
            dispatch({type: "appSettings", settings: []});
            
        }, error => {
            console.log("Failed to retrieve data", error.statusText);
            dispatch({type: "appSettings", settings: []});
        });
    }, []);

    return (
        <React.Fragment>
            <div id="searchContainer" className={rootClass}>
                <section className={`${classes.content}`}>
                    <div className={classes.appBarSpacer} />
                    <Fade
                        in={true} mountOnEnter unmountOnExit {...{ timeout: 1000 }}>
                        <Container maxWidth="lg" className={classes.container}>
                            <div className={classes.paper}>
                                <Box className={classes.titleHeader}>
                                    <Typography component="h4" variant="h5">Patient Selector</Typography>
                                </Box>
                                <form className={formClass} noValidate>
                                    <TextField
                                        variant="standard"
                                        required
                                        fullWidth
                                        margin="normal"
                                        id="firstName"
                                        label="First Name"
                                        name="firstName"
                                        autoComplete="firstName"
                                        value={state.firstName}
                                        autoFocus
                                        onChange={handleFirstNameChange}
                                        onKeyDown={handleKeyEvent}
                                        inputRef={focusInput}
                                        inputProps={{"data-lpignore": true}}
                                    />
                                    <TextField
                                        variant="standard"
                                        required
                                        fullWidth
                                        margin="normal"
                                        name="lastName"
                                        label="Last Name"
                                        id="lastName"
                                        autoComplete="lastName"
                                        value={state.lastName}
                                        onChange={handleLastNameChange}
                                        onKeyDown={handleKeyEvent}
                                        inputProps={{"data-lpignore": true}}
                                    />
                                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                        <KeyboardDatePicker
                                            className={classes.datePickerContainer}
                                            autoOk
                                            variant="dialog"
                                            openTo="year"
                                            disableFuture
                                            clearable
                                            format="yyyy-MM-dd"
                                            helperText="(YYYY-MM-DD format), example: 1977-01-12"
                                            id="birthDate"
                                            minDate={new Date("1900-01-01")}
                                            maxDate={new Date()}
                                            label="Birth Date *"
                                            value={state.dob}
                                            orientation="landscape"
                                            onChange={handleDateChange}
                                            onKeyDown={handleKeyEvent}
                                            KeyboardButtonProps={{className: "icon-container"}}

                                        />
                                    </MuiPickersUtilsProvider>
                                    <Box className={classes.divider}/>
                                    <Grid container direction="row" justify="center" alignItems="center">
                                        <Grid item xs={12} md={4} lg={4}>
                                            <div className={classes.wrapper}>
                                                <Button
                                                    fullWidth
                                                    variant="contained"
                                                    color="primary"
                                                    size="large"
                                                    className={`${buttonClassname} ${classes.submit}`}
                                                    disabled={state.loading || !isRequiredFullfilled()}
                                                    onClick={searchPatient}
                                                >
                                                    Search
                                                    <ZoomInIcon className={classes.avatar}/>
                                                </Button>
                                                {state.loading && <CircularProgress size={24} className={classes.buttonProgress} />}
                                            </div>
                                            <div className="text-right">
                                                <Link variant="body2" color="primary" className={!isAnyFullfilled() ? `${classes.linkDisabled} muted-text` : classes.link} onClick={resetFields} disabled={!isAnyFullfilled()} align="right">
                                                    Reset
                                                </Link>
                                            </div>
                                        </Grid>
                                    </Grid>
                                </form>
                            </div>
                         
                            <Snackbar open={state.popOpen} onClose={handlePopClose} classes={{anchorOriginBottomCenter: classes.snackbarWrapper}} ContentProps={{classes: {root: classes.snackbarContent}, role:'success'}}  TransitionProps={{timeout: 350}}  autoHideDuration={750} className="success-snackbar">
                                <Alert severity="success">Success!</Alert>
                            </Snackbar>
                            <Modal
                                aria-labelledby="result-modal-title"
                                aria-describedby="result-modal-description"
                                className={classes.modal}
                                open={state.resultOpen}
                                onClose={handleResultClose}
                                closeAfterTransition
                                BackdropComponent={Backdrop}
                                BackdropProps={{
                                timeout: 500,
                                }}
                            >
                                <Fade in={state.resultOpen}>
                                    <div className={classes.modalBody}>
                                        <h2 id="result-modal-title">Search Result</h2>
                                        <div id="result-modal-description">
                                            <ResultTable rows={state.searchResults} fields={['fullName', 'birthDate', 'gender']} header={['Name', 'Birth Date', 'Gender']} callback={handleViewOpen}></ResultTable>
                                        </div>
                                        <Box align="right" className={classes.modalButtonContainer}>
                                            <Button variant="contained" size="small" onClick={handleResultClose}>Cancel</Button>
                                        </Box>
                                    </div>
                                </Fade>
                            </Modal>
                            <Error message={state.errorMessage} style={errorStyle} className={classes.error}/>
                        </Container>
                    </Fade>
                </section>
            </div>
            <div className={patientViewClass}>
                <PatientViewer info={state.searchResults} launchURL={state.currentLaunchURL}/>
            </div>
            <div className={spinnerClass}><Spinner></Spinner></div>
        </React.Fragment>
    );
}
