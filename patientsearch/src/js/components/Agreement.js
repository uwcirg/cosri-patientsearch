import React from 'react';
import { makeStyles} from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import DateFnsUtils from '@date-io/date-fns';
import isValid from "date-fns/isValid";
import ClearIcon from '@material-ui/icons/Clear';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import InputLabel from '@material-ui/core/InputLabel';
import Snackbar from '@material-ui/core/Snackbar';
import Typography from '@material-ui/core/Typography';
import MuiAlert from '@material-ui/lab/Alert';
import  {MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import Error from './Error';
import OverdueAlert from './OverdueAlert';
import {sendRequest, dateTimeCompare, getShortDateFromISODateString} from './Utility';
import theme from '../context/theme';
const LOINC_SYSTEM_URL = "https://loinc.org";
const CONTRACT_CODE = "94136-9";
const useStyles = makeStyles({
    container: {
        paddingLeft: theme.spacing(3),
        paddingTop: theme.spacing(1)
    },
    buttonsContainer: {
        marginTop: theme.spacing(4),
        marginBottom: theme.spacing(3),
        position: "relative"
    },
    progressContainer: {
        minHeight: theme.spacing(6)
    },
    addButton: {
        marginRight: theme.spacing(1)
    },
    dateInput: {
        minWidth: "248px"
    },
    dateLabel: {
        fontSize: "12px",
        marginBottom: theme.spacing(0.25)
    },
    historyContainer: {
        marginBottom: theme.spacing(3)
    },
    historyTitle: {
        display: "inline-block",
        paddingBottom: "2px",
        borderBottom: `2px solid ${theme.palette.primary.main}`,
        marginBottom: theme.spacing(1)
    },
    errorContainer: {
        maxWidth: "100%",
        width: "328px",
        marginTop: theme.spacing(3)
    }
});
function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export default function Agreement(props) {
    const classes = useStyles();
    const [date, setDate] = React.useState(null);
    const [lastAgreementDate, setLastAgreementDate] = React.useState("");
    const [dateInput, setDateInput] = React.useState(null);
    const [saveInProgress, setSaveInProgress] = React.useState(false);
    const [historyInitialized, setHistoryInitialized]  = React.useState(false);
    const [history, setHistory] = React.useState([]);
    const [error, setError] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const clearDate = () => {
        setDate(null);
        setDateInput("");
    };
    const clearFields = () => {
        clearDate();
        setError("");
    };
    const hasValues = () => {
        return date;
    };
    const rowData = props.rowData ? props.rowData : {};
    const handleAdd = () => {
        setSaveInProgress(true);
        setError("");
        let resource = {
            "type": {
                "coding": [ {
                    "system": LOINC_SYSTEM_URL,
                    "code": CONTRACT_CODE,
                    "display": "Controlled substance agreement"
                }]
            },
            "subject": {
                "reference": "Patient/"+rowData.id
            },
            "resourceType": "DocumentReference",
            "date": date
        };
        fetch("/fhir/DocumentReference", {
            "method": "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"},
            cache: "no-cache",
            body: JSON.stringify(resource)
        })
        .then(response => response.json())
        .then(() => {
            setTimeout(() => setSaveInProgress(false), 150);
            setSaveInProgress(false);
            setOpen(true);
            clearFields();
            setTimeout(() => getHistory(), 50);
        }).catch(e => {
            console.log("error submtting request ", e)
            setError("Data submission failed.  Unable to add.");
            setOpen(false);
            setTimeout(() => setSaveInProgress(false), 150);
        })
    }
    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
          return;
        }
        setOpen(false);
    };
    const hasHistory = () => {
        return (!history || !history.length);
    };
    const getHistory = () => {
        if (!rowData.id) return [];
        setHistoryInitialized(false);
         /*
          * retrieve agreement history
          */
         sendRequest("/fhir/DocumentReference?patient="+rowData.id+"&_sort=-date", {nocache: true}).then(response => {
            let data = null;
            try {
                data = JSON.parse(response);
            } catch(e) {
                console.log("Error parsing pain agreement request data ", e);
            }
            if (!data || !data.entry || !data.entry.length) {
                setHistoryInitialized(true);
                return;
            }
            let agreementData = data.entry.filter(item => {
                let resource = item.resource;
                if (!resource) return false;
                if (!resource.type || !resource.type.coding || !resource.type.coding.length) return false;
                return resource.type.coding[0].code === CONTRACT_CODE;
            });
            agreementData = agreementData.sort(function(a, b) {
                return dateTimeCompare(a.resource.date, b.resource.date);
            });
            if (agreementData.length) {
                setHistory(agreementData);
                setLastAgreementDate(getShortDateFromISODateString(agreementData[0].resource.date));
            }
            setHistoryInitialized(true);

        }, error => {
            setHistoryInitialized(true);
            console.log("Failed to retrieve data", error);
        });
        return "";
    };
    const displayHistory = () => {
        if (hasHistory()) return "No previous recorded agreement.";
        return "Added on <b>" + lastAgreementDate + "</b>";
    };
    React.useEffect(() => {
        getHistory();
    },[]);
    return (
        <div className={classes.container}>
            <h3>{`Add Controlled Substance Agreement for ${rowData.first_name} ${rowData.last_name}`}</h3>
            <div>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    {/* order date field */}
                    <InputLabel className={classes.dateLabel}>Agreement Date</InputLabel>
                    <KeyboardDatePicker
                        autoOk={true}
                        variant="dialog"
                        openTo="year"
                        disableFuture
                        InputProps={{
                            startAdornment: (
                            <InputAdornment position="end" style={{order: 1, marginLeft: 0}}>
                                <IconButton onClick={() => { clearDate(); }} style={{order: 2, padding: 0}} aria-label="Clear date" title="Clear date">
                                    <ClearIcon color="primary" fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                            ),
                            className: classes.dateInput
                        }}
                        format="yyyy-MM-dd"
                        minDate={new Date("1950-01-01")}
                        invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
                        disableFuture
                        placeholder="YYYY-MM-DD"
                        value={date}
                        orientation="landscape"
                        onChange={(event, dateString) => {
                            setDateInput(dateString);
                            if (!event || !isValid(event)) {
                                if (event && ((String(dateInput).replace(/[-_]/g, '').length) >= 8)) setDate(event);
                                return;
                            }
                            setDate(event);
                        }}
                        KeyboardButtonProps={{color: "primary", title: "Date picker"}}

                    />
                </MuiPickersUtilsProvider>
            </div>
            <div className={classes.buttonsContainer}>
                <Button variant="contained" color="primary" className={classes.addButton} disabled={!hasValues()} onClick={handleAdd}>Add</Button>
                <Button variant="outlined" onClick={clearFields} disabled={!hasValues()}>Clear</Button>
                {saveInProgress && <div className={classes.progressContainer}><CircularProgress className={classes.progressIcon} color="primary" size={32} /></div>}
            </div>
            <Snackbar open={open} autoHideDuration={3000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="success">Entry added successfully.</Alert>
            </Snackbar>
            <div className={classes.errorContainer}>
                {error && <Error message={error}></Error>}
            </div>
            {!historyInitialized && <div className={classes.progressContainer}><CircularProgress color="primary" size={32} /></div>}
            {historyInitialized && <div className={classes.historyContainer}>
                <Typography variant="caption" display="block" className={classes.historyTitle} gutterBottom>
                    Last Controlled Substance Agreement
                </Typography>
                <br/>
                <span dangerouslySetInnerHTML={{ __html: displayHistory()}}></span>
                <OverdueAlert date={lastAgreementDate}  message="A new opioid agreement is due for this patient on or before [duedate]."></OverdueAlert>
            </div>}
        </div>
    );
};
Agreement.proptypes = {
    rowData: PropTypes.object
};
