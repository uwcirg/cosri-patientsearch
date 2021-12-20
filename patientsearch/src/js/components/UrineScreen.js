import React from 'react';
import PropTypes from "prop-types";
import { makeStyles} from '@material-ui/core/styles';
import DateFnsUtils from '@date-io/date-fns';
import isValid from "date-fns/isValid";
import ClearIcon from '@material-ui/icons/Clear';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Snackbar from '@material-ui/core/Snackbar';
import Typography from '@material-ui/core/Typography';
import MuiAlert from '@material-ui/lab/Alert';
import  {MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import Error from './Error';
import OverdueAlert from "./OverdueAlert";
import {getSettings, dateTimeCompare, sendRequest} from './Utility';
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        paddingLeft: theme.spacing(3),
        paddingTop: theme.spacing(1)
    },
    typeContainer: {
        marginTop: theme.spacing(1)
    },
    textDisplay: {
        marginTop: theme.spacing(3)
    },
    buttonsContainer: {
        marginTop: theme.spacing(4),
        marginBottom: theme.spacing(3),
        position: "relative"
    },
    progressContainer: {
        position: "absolute",
        backgroundColor: "#FFF",
        zIndex: 10,
        top: "-24px",
        left: "-24px",
        right: 0,
        bottom: 0,
        minHeight: theme.spacing(8)
    },
    progressIcon: {
        marginLeft: theme.spacing(3),
        marginTop: theme.spacing(3)
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
    addButton: {
        marginRight: theme.spacing(1)
    },
    dateInput: {
        minWidth: "248px"
    },
    selectBox: {
        minWidth: "248px",
        fontSize: "14px"
    },
    dateLabel: {
        fontSize: "12px",
        marginBottom: theme.spacing(0.25)
    },
    readonlyLabel: {
        fontSize: "12px",
        marginBottom: theme.spacing(0.5)
    },
    menuItem: {
        fontSize: "14px"
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

export default function UrineScreen(props) {
    const classes = useStyles();
    const [type, setType] = React.useState("");
    const [date, setDate] = React.useState(null);
    const [lastUrineScreenDate, setLastUrineScreenDate] = React.useState("");
    const [dateInput, setDateInput] = React.useState(null);
    const [history, setHistory] = React.useState([]);
    const [saveInProgress, setSaveInProgress] = React.useState(false);
    const [error, setError] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [initialized, setInitialized] = React.useState(false);
    const clearDate = () => {
        setDate(null);
        setDateInput("");
    };
    const clearFields = () => {
        clearDate();
        if (!onlyOneUrineScreenType()) setType("");
        setError("");
    };
    const handleTypeChange = (event) => {
        setType(event.target.value);
    };
    const [urineScreenTypes, setUrineScreenTypes] = React.useState([]);
    const hasValues = () => {
        return type && date;
    };
    const rowData = props.rowData ? props.rowData : {};
    const getHistory = (types) => {
        if (!rowData.id) return [];
        if (!types) types = urineScreenTypes;
         /*
         * retrieve urine screen history
         */
         sendRequest("/fhir/ServiceRequest?patient="+rowData.id, {nocache: true}).then(response => {
            let data = null;
            try {
                data = JSON.parse(response);
            } catch(e) {
                console.log("Eerror parsing urine screen service request data ", e);
            }
            if (!data || !data.entry || !data.entry.length) {
                return;
            }
            const availableCodes = types.map(item => item.code);
            let urineScreenData = data.entry.filter(item => {
                let resource = item.resource;
                if (!resource) return false;
                if (!resource.code || !resource.code.coding || !resource.code.coding.length) return false;
                return availableCodes.indexOf(resource.code.coding[0].code) !== -1;
            });
            urineScreenData = urineScreenData.sort(function(a, b) {
                return dateTimeCompare(a.resource.authoredOn, b.resource.authoredOn);
            });
            if (urineScreenData.length) {
                setHistory(urineScreenData);
                setLastUrineScreenDate(urineScreenData[0].resource.authoredOn.substring(0,urineScreenData[0].resource.authoredOn.indexOf("T")));
            }

        }, error => {
            console.log("Failed to retrieve data", error);
        });
        return "";
    };
    const handleAdd = () => {
        let typeMatch = urineScreenTypes.filter(item => {
            return item.code === type
        });
        let resource = {
            "authoredOn": date,
            "code": {
                "coding": [
                    {
                        "code": type,
                        "display": typeMatch[0].display,
                        "system": typeMatch[0].system
                    }

                ],
                "text": typeMatch[0].text
            },
            "resourceType": "ServiceRequest",
            "subject": {
                "reference": "Patient/"+rowData.id
            }
        };
        setSaveInProgress(true);
        setError("");
        fetch("/fhir/ServiceRequest", {
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
    const hasHistory = () => {
        return (!history || !history.length);
    };
    const displayHistory = () => {
        if (hasHistory()) return "";
        const resource = history[0].resource;
        const orderText = resource && resource.code && resource.code.text ? resource.code.text : "";
        const orderDate = resource.authoredOn.substring(0,resource.authoredOn.indexOf("T"));
        if (orderText) return orderText + " ordered on <b>" + orderDate + "</b>";
        return "Ordered on <b>" + orderDate + "</b>";
    };
    const getOneUrineScreenDisplayText = () => {
        let matchedType = urineScreenTypes[0];
        if (matchedType) return matchedType.text;
        else return "";
    }
    const onlyOneUrineScreenType = () => {
        return urineScreenTypes.length === 1;
    }
    const initUrineScreenTypes = () => {
        getSettings(data => {
            if (data && data["UDS_LAB_TYPES"]) {
                setUrineScreenTypes(data["UDS_LAB_TYPES"]);
            }
            setTimeout(() => setInitialized(true), 150);
        });
    }
    const hasUrineScreenTypes = () => {
        return !onlyOneUrineScreenType() && !noUrineScreenTypes();
    }
    const noUrineScreenTypes = () => {
        return !urineScreenTypes || !urineScreenTypes.length;
    }
    React.useEffect(() => {
        initUrineScreenTypes();
    }, []);
    React.useEffect(() => {
        if (onlyOneUrineScreenType()) {
            //set urine screen type if only one available
            setType(urineScreenTypes[0].code);
        }
        getHistory();
    },[urineScreenTypes]);
    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
          return;
        }
        setOpen(false);
    };
    return (
        <div className={classes.container}>
            <h3>{`Urine Drug Toxicology Screen for ${rowData.first_name} ${rowData.last_name}`}</h3>
            <div>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    {/* order date field */}
                    <InputLabel className={classes.dateLabel}>Order Date</InputLabel>
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
            {!initialized && <CircularProgress className={classes.progressIcon} color="primary" size={28} />}
            {initialized && <div className={classes.typeContainer}>
                {onlyOneUrineScreenType() && <div className={classes.textDisplay}>
                    <InputLabel className={classes.readonlyLabel}>Urine Drug Screen Name</InputLabel>
                    <Typography variant="subtitle2">{getOneUrineScreenDisplayText()}</Typography>
                </div>
                }
                {hasUrineScreenTypes() && <FormControl variant="standard">
                    <InputLabel className={classes.label}>Urine Drug Screen Name</InputLabel>
                    <Select
                    value={type}
                    onChange={handleTypeChange}
                    className={classes.selectBox}
                    >
                    {
                        urineScreenTypes.map(item => {
                            return <MenuItem value={item.code} key={item.code}><Typography variant="body2">{item.text}</Typography></MenuItem>
                        })
                    }
                    </Select>
                </FormControl>}
                {noUrineScreenTypes() && <div className={classes.errorContainer}><Error message={"No urine drug screen type list is loaded."}></Error></div>}
            </div>}
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
            {initialized && <div className={classes.historyContainer}>
                <Typography variant="caption" display="block" className={classes.historyTitle} gutterBottom>
                    Last Urine Drug Screen
                </Typography>
                <div dangerouslySetInnerHTML={{ __html: displayHistory()}}></div>
                <OverdueAlert date={lastUrineScreenDate}  type="urine drug screen"></OverdueAlert>
            </div>}
        </div>
    );

};
UrineScreen.proptypes = {
    rowData: PropTypes.object
};
