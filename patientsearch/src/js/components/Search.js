import format from "date-fns/format";
import isValid from "date-fns/isValid";
import DateFnsUtils from '@date-io/date-fns';
import clsx from 'clsx';
import React from 'react';
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
    modalBody: {
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[4],
        padding: theme.spacing(2, 4, 3),
        border: 0
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
    const classes = useStyles();
    const [appReady, setAppReady] = React.useState(false);
    const [appSettings, setAppSettings] = React.useState({});
    const [loading, setLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState("");
    const [popOpen, setPop] = React.useState(false);
    const [resultOpen, setResultOpen] = React.useState(false);
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [dob, setDOB] = React.useState(null);
    const [success, setSuccess] = React.useState(false);
    const rootClass = clsx(classes.root, {
        [classes.ready]: appReady,
        [classes.notReady]: !appReady
    });
    const buttonClassname = clsx({
        [classes.buttonSuccess]: success,
    });
    const [searchResults, setSearchResults] = React.useState([]);

    const getLaunchURL = (patientId) => {
        if (!patientId) {
            console.log("Missing information: patient Id");
        }
        let baseURL = appSettings["SOF_CLIENT_LAUNCH_URL"];
        let iss = appSettings["SOF_HOST_FHIR_URL"];
        let launchParam = btoa(JSON.stringify({"b":patientId}));
        return `${baseURL}?launch=${launchParam}&iss=${iss}`;
    }

    const getPatientSearchURL = () => {
        const dataURL = "/external_search/Patient";
        let formattedDate = format(new Date(dob), "yyyy-MM-dd");
        const params = [
            `subject:Patient.name.given=${firstName}`,
            `subject:Patient.name.family=${lastName}`,
            `subject:Patient.birthdate=eq${formattedDate}`
        ];
        return `${dataURL}?${params.join("&")}`;
    };
    const searchPatient = () => {
        setLoading(true);
        setErrorMessage('');
        fetchData(getPatientSearchURL()).then(response => {
            if (!response || !response.entry || !response.entry.length) {
                setErrorMessage("No patient found.");
                setSuccess(false);
                setLoading(false);
                return;
            }
            setErrorMessage('');
            setSuccess(true);
            setPop(true);
            setLoading(false);
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
            setSearchResults(formattedResult);
            setTimeout(function() {
                setResultOpen(true);
            }, 500);


        }).catch(e => {
            setErrorMessage(`Patient search error: ${e}`);
            setSuccess(false);
            setLoading(false);
        });
    };
    const handleDateChange = (date) => {
        setErrorMessage("");
        let convoDate = new Date(date);
        if (!isValid(convoDate)) {
            return;
        }
        setDOB(date);
    };

    const handleFirstNameChange = (event) => {
        setErrorMessage("");
        setFirstName(event.target.value);
    }
    const handleLastNameChange = (event) => {
        setErrorMessage("");
        setLastName(event.target.value);
    }

    const handlePopClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setPop(false);
    }

    const handleResultClose = () => {
        setSuccess(false);
        setResultOpen(false);
      };

    const isRequiredFullfilled = () => {
        return firstName && lastName && dob;
    }

    const isAnyFullfilled = () => {
        return firstName || lastName || dob;
    }

    const reset = () => {
        setFirstName("");
        setLastName("");
        setDOB(null);
        setErrorMessage("");
        setSuccess(false);
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
        "display" : errorMessage? "block": "none"
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
                setAppSettings(settings);
            }
            setAppReady(true);
        }, error => {
            console.log("Failed to retrieve data", error.statusText);
            setAppReady(true);
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
                                    <Typography component="h4" variant="h5">
                                        Patient Selector
                                    </Typography>
                                </Box>
                                <form className={classes.form} noValidate>
                                    <TextField
                                        variant="standard"
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="firstName"
                                        label="First Name"
                                        name="firstName"
                                        autoComplete="firstName"
                                        value={firstName}
                                        autoFocus
                                        onChange={handleFirstNameChange}
                                        inputRef={focusInput}
                                        inputProps={{"data-lpignore": true}}
                                    />
                                    <TextField
                                        variant="standard"
                                        margin="normal"
                                        required
                                        fullWidth
                                        name="lastName"
                                        label="Last Name"
                                        id="lastName"
                                        autoComplete="lastName"
                                        value={lastName}
                                        onChange={handleLastNameChange}
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
                                            value={dob}
                                            orientation="landscape"
                                            onChange={handleDateChange}
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
                                                    disabled={loading || !isRequiredFullfilled()}
                                                    onClick={searchPatient}
                                                >
                                                    Search
                                                    <ZoomInIcon className={classes.avatar}/>
                                                </Button>
                                                {loading && <CircularProgress size={24} className={classes.buttonProgress} />}
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
                            <Snackbar open={popOpen} autoHideDuration={1000} onClose={handlePopClose}>
                                <Alert onClose={handlePopClose} severity="success">
                                    Success!
                                </Alert>
                            </Snackbar>
                            <Modal
                                aria-labelledby="result-modal-title"
                                aria-describedby="result-modal-description"
                                className={classes.modal}
                                open={resultOpen}
                                onClose={handleResultClose}
                                closeAfterTransition
                                BackdropComponent={Backdrop}
                                BackdropProps={{
                                timeout: 500,
                                }}
                            >
                                <Fade in={resultOpen}>
                                    <div className={classes.modalBody}>
                                        <h2 id="result-modal-title">Search Result</h2>
                                        <div id="result-modal-description">
                                            <ResultTable rows={searchResults}></ResultTable>
                                        </div>
                                        <Box align="center" className={classes.modalButtonContainer}>
                                            <Button variant="contained" onClick={handleResultClose}>Cancel</Button>
                                        </Box>
                                    </div>
                                </Fade>
                            </Modal>
                            <Error message={errorMessage} style={errorStyle} className={classes.error}/>
                        </Container>
                    </Fade>
                </section>
            </div>
            <div className={appReady?"hide": "show"}><Spinner className={appReady?"hide": "show"}></Spinner></div>
        </React.Fragment>
    );
}
