import React from "react";
import PropTypes from "prop-types";
import { makeStyles} from "@material-ui/core/styles";
import DateFnsUtils from "@date-io/date-fns";
import isValid from "date-fns/isValid";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ClearIcon from "@material-ui/icons/Clear";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Snackbar from "@material-ui/core/Snackbar";
import Typography from "@material-ui/core/Typography";
import MuiAlert from "@material-ui/lab/Alert";
import  {MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";
import EditButtonGroup from "./EditButtonGroup";
import Error from "./Error";
import FormattedInput from "./FormattedInput";
import OverdueAlert from "./OverdueAlert";
import {
    fetchData,
    dateTimeCompare,
    getShortDateFromISODateString,
    getSettings,
    isAdult,
    sendRequest,
} from "./Utility";
import theme from "../context/theme";

const useStyles = makeStyles({
    container: {
        paddingLeft: theme.spacing(3),
        paddingRight: theme.spacing(3),
        paddingTop: theme.spacing(1)
    },
    contentContainer: {
        position: "relative"
    },
    addContainer: {
        position: "relative",
        marginBottom: theme.spacing(2),
        padding: theme.spacing(1, 2, 2, 2),
        border: `2px solid ${theme.palette.muted.light}`
    },
    typeContainer: {
        position: "relative"
    },
    textDisplay: {
        marginTop: theme.spacing(3)
    },
    buttonsContainer: {
        marginTop: theme.spacing(2.5),
        position: "relative"
    },
    progressContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: "hsl(0deg 0% 100% / 80%)",
        zIndex: 500,
        minHeight: theme.spacing(6),
        boxShadow: "none"
    },
    progressIcon: {
        position: "absolute",
        top: "10%",
        left: "10%"
    },
    historyContainer: {
        position: "relative",
        marginBottom: theme.spacing(3),
        padding: theme.spacing(1, 2),
        border: `2px solid ${theme.palette.muted.light}`,
        minHeight: theme.spacing(9)
    },
    historyTitle: {
        display: "inline-block",
        paddingBottom: "2px",
        color: theme.palette.dark.main,
        borderBottom: `2px solid ${theme.palette.dark.secondary}`,
        marginBottom: theme.spacing(0.5)
    },
    addTitle: {
        display: "inline-block",
        color: theme.palette.dark.main,
        borderBottom: `2px solid ${theme.palette.dark.secondary}`,
        marginBottom: theme.spacing(2.5)
    },
    addButton: {
        marginRight: theme.spacing(1)
    },
    dateInput: {
        minWidth: "248px"
    },
    selectFormControl: {
        marginBottom: theme.spacing(1)
    },
    selectBox: {
        minWidth: "248px",
        fontSize: "14px",
        marginRight: theme.spacing(0.5)
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
    editInput: {
        width: theme.spacing(10)
    },
    errorContainer: {
        maxWidth: "100%",
        marginTop: theme.spacing(3)
    },
    totalEntriesContainer: {
        fontSize: "12px",
        color: theme.palette.muted.main,
        marginTop: theme.spacing(1)
    }
});
function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export default function UrineScreen(props) {
    const classes = useStyles();
    const [type, setType] = React.useState("");
    const [date, setDate] = React.useState(null);
    const [lastEntryId, setLastEntryId] = React.useState(null);
    const [lastUrineScreenDate, setLastUrineScreenDate] = React.useState("");
    const [lastType, setLastType] = React.useState("");
    const [dateInput, setDateInput] = React.useState(null);
    const [history, setHistory] = React.useState([]);
    const [addInProgress, setAddInProgress] = React.useState(false);
    const [updateInProgress, setUpdateInProgress] = React.useState(false);
    const [error, setError] = React.useState("");
    const [snackOpen, setSnackOpen] = React.useState(false);
    const [initialized, setInitialized] = React.useState(false);
    const [historyInitialized, setHistoryInitialized] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    const [editType, setEditType] = React.useState("");
    const [editDate, setEditDate] = React.useState("");
    const URINE_SCREEN_TYPE_LABEL = "Urine Drug Screen Name";
    const clearDate = () => {
        setDate(null);
        setDateInput("");
    };
    const clearHistory = () => {
        setHistory([]);
        setLastType("");
        setLastEntryId(null);
        setLastUrineScreenDate("");
    }
    const clearFields = () => {
        clearDate();
        if (!onlyOneUrineScreenType()) setType("");
        setError("");
    };
    const handleTypeChange = (event) => {
        setType(event.target.value);
    };
    const handleEditTypeChange = (event) => {
        setEditType(event.target.value);
    }
    const [urineScreenTypes, setUrineScreenTypes] = React.useState([]);
    const hasValues = () => {
        return type && date;
    };
    const hasError = () => {
        return error !== "";
    }
    const rowData = props.rowData ? props.rowData : {};
    const getHistory = (types, callback) => {
        callback = callback || function() {};
        if (!rowData.id) {
            setHistoryInitialized(true);
            callback();
            return [];
        }
        if (!types) types = urineScreenTypes;

        setHistoryInitialized(false);
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
                setEditMode(false);
                clearHistory();
                setTimeout(() => setHistoryInitialized(true), 300);
                callback();
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
                const resourceType = urineScreenData[0].resource.code.coding[0].code;
                const resourceDate =  getShortDateFromISODateString(urineScreenData[0].resource.authoredOn);
                setLastUrineScreenDate(resourceDate);
                setEditDate(resourceDate);
                setLastType(resourceType);
                setEditType(resourceType);
                setLastEntryId(urineScreenData[0].resource.id);
            } else clearHistory();
            setTimeout(() => {
                setEditMode(false);
                setHistoryInitialized(true);
            }, 300);
            callback();

        }, error => {
            console.log("Failed to retrieve data", error);
            callback(error);
            setHistoryInitialized(true);
        });
        return "";
    };
    const handleAdd = (params) => {
        setAddInProgress(true);
        handleUpdate(params, () => setTimeout(() => setAddInProgress(false), 250));
    }
    const handleUpdate = (params, callback) => {
        params = params || {};
        callback = callback || function() {};
        const testType = params.type ? params.type : type;
        let typeMatch = urineScreenTypes.filter(item => {
            return item.code === testType;
        });
        if (!typeMatch.length) {
            setError("Unknown urine screen type " + testType);
            callback();
            return false;
        }
        let resource = {
            "id": params.id,
            "authoredOn": params.date ? params.date : date,
            "code": {
                "coding": [
                    {
                        "code": testType,
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
        setError("");
        fetchData("/fhir/ServiceRequest"+(params.id?"/"+params.id:""), {
            "method": params.method ? params.method : "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"},
            cache: "no-cache",
            body: JSON.stringify(resource)
        }, (e) => {
            if (e) {
                handleSubmissionError();
            }
            callback(e);
        })
        .then(() => {
            setSnackOpen(true);
            clearFields();
            setTimeout(() => {
                getHistory(urineScreenTypes, callback);
            }, 150);
        }).catch(e => {
            callback(e);
            console.log("error submtting request ", e);
            handleSubmissionError();
        });
    };
    const handleSubmissionError = () => {
        setError("Data submission failed. Unable to process your request.");
        setSnackOpen(false);
    }
    const handleEnableEditMode = () => {
        setError("");
        setEditMode(true);
    }
    const handleDisableEditMode = () => {
        setEditType(lastType);
        setEditDate(lastUrineScreenDate);
        setError("");
        setEditMode(false);
    }
    const isValidEditType = () => {
        if (onlyOneUrineScreenType()) return true;
        return editType;
    }
    const isValidEditDate = () => {
        return isValid(new Date(editDate));
    }
    const hasValidEditEntry = () => {
        return isValidEditType() && isValidEditDate();
    }
    const handleEditChange = (event) => {
        setEditDate(event.target.value);
    }
    const handleEditSave = () => {
        setUpdateInProgress(true);
        handleUpdate({
            method: "PUT",
            id: lastEntryId,
            date: editDate,
            type: editType
        }, () => setTimeout(setUpdateInProgress(false), 350));
    }
    const handleDelete = () => {
        setUpdateInProgress(true);
        handleUpdate({
            id: lastEntryId,
            method: "DELETE",
            date: editDate,
            type: editType
        }, () => setTimeout(setUpdateInProgress(false), 350));
    }
    const hasHistory = () => {
        return (history && history.length > 0);
    };
    const displayHistory = () => {
        if (!hasHistory()) return "";
        const resource = history[0].resource;
        const orderText = resource && resource.code && resource.code.text ? resource.code.text : "";
        if (orderText) return orderText + " ordered on <b>" + lastUrineScreenDate + "</b>";
        return "Ordered on <b>" + lastUrineScreenDate + "</b>";
    };
    const displayEditHistory = () => {
        if (!hasHistory()) return null;
        const resource = history[0].resource;
        const orderText = resource && resource.code && resource.code.text ? resource.code.text : "";
        return (
            <React.Fragment>
                <span>{onlyOneUrineScreenType()?
                            orderText:
                            <FormControl>
                                <Select
                                value={editType}
                                onChange={handleEditTypeChange}
                                className={classes.selectBox}
                                IconComponent={() => <ArrowDropDownIcon color="primary"></ArrowDropDownIcon>}
                                error={hasError()}
                                >
                                {getUrineScreenTypeSelectList()}
                                </Select>
                                <FormHelperText>{`(${URINE_SCREEN_TYPE_LABEL})`}</FormHelperText>
                            </FormControl>
                            } ordered on </span>
                <div style={{display: "inline-block"}}> <FormattedInput
                    value={editDate}
                    helperText="(YYYY-MM-DD)"
                    disableFocus={!onlyOneUrineScreenType()}
                    handleChange={(e) => handleEditChange(e)}
                    handleKeyDown={(e) => handleEditSave(e)}
                    inputClass={{input: classes.editInput}}
                    error={hasError()}></FormattedInput></div>
            </React.Fragment>
        );
      }
    const getOneUrineScreenDisplayText = () => {
        let matchedType = urineScreenTypes[0];
        if (matchedType) return matchedType.text;
        else return "";
    };
    const onlyOneUrineScreenType = () => {
        return urineScreenTypes.length === 1;
    };
    const initUrineScreenTypes = () => {
        getSettings(data => {
            if (data && data["UDS_LAB_TYPES"]) {
                setUrineScreenTypes(data["UDS_LAB_TYPES"]);
            }
            setTimeout(() => setInitialized(true), 150);
        });
    };
    const hasUrineScreenTypes = () => {
        return !onlyOneUrineScreenType() && !noUrineScreenTypes();
    };
    const noUrineScreenTypes = () => {
        return !urineScreenTypes || !urineScreenTypes.length;
    };
    const getUrineScreenTypeSelectList = () => {
        return urineScreenTypes.map(item => {
            return <MenuItem value={item.code} key={item.code}><Typography variant="body2">{item.text}</Typography></MenuItem>;
        })
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
    const handleSnackClose = (event, reason) => {
        if (reason === "clickaway") {
          return;
        }
        setSnackOpen(false);
    };
    return (
        <div className={classes.container}>
            <h3>{`Urine Drug Toxicology Screen for ${rowData.first_name} ${rowData.last_name}`}</h3>
            <div className={classes.contentContainer}>
                {addInProgress && <div className={classes.progressContainer}><CircularProgress className={classes.progressIcon} color="primary" size={32} /></div>}
                {/* UI to add new */}
                <div className={classes.addContainer}>
                    <Typography variant="caption" display="block" className={classes.addTitle}>
                        Add New
                    </Typography>
                    {/* urine screen date/datepicker */}
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
                                maxDateMessage="Date must not be in the future"
                                invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
                                placeholder="YYYY-MM-DD"
                                value={date}
                                orientation="landscape"
                                onChange={(event, dateString) => {
                                    setDateInput(dateString);
                                    if (!event || !isValid(event)) {
                                        if (event && ((String(dateInput).replace(/[-_]/g, "").length) >= 8)) setDate(event);
                                        return;
                                    }
                                    setDate(event);
                                }}
                                KeyboardButtonProps={{color: "primary", title: "Date picker"}}
                                autoFocus
                            />
                        </MuiPickersUtilsProvider>
                    </div>
                     {/* urine screen type selector */}
                    <div className={classes.typeContainer}>
                        {!initialized && <div className={classes.progressContainer}><CircularProgress className={classes.progressIcon} color="primary" size={28} /></div>}
                        {initialized && <div>
                            {onlyOneUrineScreenType() && <div className={classes.textDisplay}>
                            <InputLabel className={classes.readonlyLabel}>{URINE_SCREEN_TYPE_LABEL}</InputLabel>
                            <Typography variant="subtitle2">{getOneUrineScreenDisplayText()}</Typography>
                            </div>
                            }
                            {hasUrineScreenTypes() && <FormControl className={classes.selectFormControl} variant="standard">
                                <InputLabel className={classes.label}>{URINE_SCREEN_TYPE_LABEL}</InputLabel>
                                <Select
                                value={type}
                                onChange={handleTypeChange}
                                className={classes.selectBox}
                                IconComponent={() => <ArrowDropDownIcon color="primary"></ArrowDropDownIcon>}
                                >
                                {getUrineScreenTypeSelectList()}
                                </Select>
                            </FormControl>}
                            {noUrineScreenTypes() && <div className={classes.errorContainer}><Error message={"No urine drug screen type list is loaded."}></Error>
                            </div>}
                        </div>}
                    </div>
                    <div className={classes.buttonsContainer}>
                        <Button variant="contained" color="primary" className={classes.addButton} disabled={!hasValues()} onClick={() => handleAdd()}>Add</Button>
                        <Button variant="outlined" onClick={clearFields} disabled={!hasValues()}>Clear</Button>
                    </div>
                </div>
                {/* history */}
                <div className={classes.historyContainer}>
                    {!historyInitialized && <div className={classes.progressContainer}>
                        <CircularProgress color="primary" size={32} className={classes.progressIcon} />
                    </div>}
                    {updateInProgress && <div className={classes.progressContainer}><CircularProgress className={classes.progressIcon} color="primary" size={28} /></div>}
                    <Typography variant="caption" display="block" className={classes.historyTitle} gutterBottom>
                        Last Urine Drug Screen
                    </Typography>
                    <div>
                        {historyInitialized && hasHistory() && !editMode && <span dangerouslySetInnerHTML={{ __html: displayHistory()}}></span>}
                        {historyInitialized && hasHistory() && editMode && displayEditHistory()}
                        {historyInitialized && hasHistory() &&
                        <EditButtonGroup
                            onEnableEditMode={handleEnableEditMode}
                            onDisableEditMode={handleDisableEditMode}
                            isUpdateDisabled={!hasValidEditEntry()}
                            handleEditSave={handleEditSave}
                            handleDelete={handleDelete}
                            entryDescription={displayHistory()}
                        ></EditButtonGroup>}
                    </div>
                    {!isAdult(rowData.dob) && !hasHistory() && <div>No previously recorded urine drug screen</div>}
                    {/* alerts */}
                    {isAdult(rowData.dob) && <OverdueAlert date={lastUrineScreenDate}  type="urine drug screen"></OverdueAlert>}
                    {/* total record count */}
                    {hasHistory() && <div className={classes.totalEntriesContainer}><b>{history.length}</b> urine drug screen record(s) found</div>}
                </div>
                <Snackbar open={snackOpen} autoHideDuration={3000} onClose={handleSnackClose}>
                    <Alert onClose={handleSnackClose} severity="success">Request processed successfully.</Alert>
                </Snackbar>
                <div className={classes.errorContainer}>
                    {error && <Error message={error}></Error>}
                </div>
            </div>
        </div>
    );

}

UrineScreen.propTypes = {
    rowData: PropTypes.object.isRequired
};
