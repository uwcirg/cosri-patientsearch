import format from "date-fns/format";
import isValid from "date-fns/isValid";
import DateFnsUtils from '@date-io/date-fns';
import clsx from 'clsx';
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Container from '@material-ui/core/Container';
import { green } from '@material-ui/core/colors';
import Fade from '@material-ui/core/Fade';
import Grid from '@material-ui/core/Grid';
import  {MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import Error from "./Error";


const useStyles = makeStyles((theme) => ({
    root: {
        marginTop: theme.spacing(3),
        display: 'flex',
        paddingRight: theme.spacing(2),
        paddingLeft: theme.spacing(2)
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

export default function Search() {
    let focusInput = React.useRef(null);
    const classes = useStyles();
    const [loading, setLoading] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState("");
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [dob, setDOB] = React.useState(null);
    const [success, setSuccess] = React.useState(false);
    const buttonClassname = clsx({
        [classes.buttonSuccess]: success,
    });
 
    const getPatientSearchURL = () => {
        const dataURL = process.env.PATIENT_SEARCH_URL;
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
        fetchData(getPatientSearchURL()).then(response => {
            if (!response || !response.entry || !response.entry.length) {
                setErrorMessage("No patient found.");
                setSuccess(false);
                return;
            }
            setErrorMessage('');
            setSuccess(true);
            setLoading(false);
            //TODO get the correct Launch URL
            if (process.env.LAUNCH_URL) {
                window.location = process.env.LAUNCH_URL;
                return;
            }
            setErrorMessage('Launch URL is not set.');
        
        }).catch(e => {
            setErrorMessage(`Patient search error: ${e}`);
            setSuccess(false);
            setLoading(false);
        });
    };
    const handleDateChange = (date) => {
        let convoDate = new Date(date);
        if (!isValid(convoDate)) {
            return;
        }
        setDOB(date);
    };

    const handleFirstNameChange = (event) => {
        setFirstName(event.target.value);
    }
    const handleLastNameChange = (event) => {
        setLastName(event.target.value);
    } 

    const isRequiredFullfilled = () => {
        return firstName && lastName && dob;
    }

    const isAnyFullfilled = () => {
        return firstName || lastName || dob;
    }
    
    const resetFields = (event) => {
        event.preventDefault();
        if (!isAnyFullfilled()) {
            return false;
        }
        setFirstName("");
        setLastName("");
        setDOB(null);
        setErrorMessage("");
        setSuccess(false);
        setTimeout(() => {
            focusInput.current.focus();
        }, 100);
    }
    let errorStyle = {
        "display" : errorMessage? "block": "none"
    };
    
    return (
        <div id="searchContainer" className={classes.root}>
            <section className={classes.content}>
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
                                        helperText="(YYYY-MM-DD format)"
                                        id="birthDate"
                                        minDate={new Date("1900-01-01")}
                                        maxDate={new Date()}
                                        label="Birth Date *"
                                        value={dob}
                                        onChange={handleDateChange}

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
                        <Error message={errorMessage} style={errorStyle} className={classes.error}/>
                    </Container>
                </Fade>
            </section>
        </div>
    );
}
