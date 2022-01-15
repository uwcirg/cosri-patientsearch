import React from "react";
import PropTypes from "prop-types";
import { makeStyles} from "@material-ui/core/styles";
import DateFnsUtils from "@date-io/date-fns";
import isValid from "date-fns/isValid";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ClearIcon from "@material-ui/icons/Clear";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Snackbar from "@material-ui/core/Snackbar";
import Typography from "@material-ui/core/Typography";
import MuiAlert from "@material-ui/lab/Alert";
import  {MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";
import EditButtonGroup from "./EditButtonGroup";
import Error from "./Error";
import HistoryTable from "./HistoryTable";
import FormattedInput from "./FormattedInput";
import OverdueAlert from "./OverdueAlert";
import {
    fetchData,
    dateTimeCompare,
    getShortDateFromISODateString,
    getSettings,
    isAdult,
    padDateString,
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
        padding: theme.spacing(2)
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
        marginBottom: theme.spacing(2),
        padding: theme.spacing(2),
        minHeight: theme.spacing(9)
    },
    historyTitle: {
        display: "inline-block",
        fontWeight: 500,
        color: theme.palette.dark.main,
        borderBottom: `2px solid ${theme.palette.primary.lightest}`,
        marginBottom: theme.spacing(1)
    },
    addTitle: {
        display: "inline-block",
        fontWeight: 500,
        color: theme.palette.dark.main,
        borderBottom: `2px solid ${theme.palette.primary.lightest}`,
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
    expandIcon: {
        marginLeft: theme.spacing(2),
        verticalAlign: "middle",
        fontSize: "12px"
    },
    endIcon: {
        marginLeft: "-4px",
        position: "relative"
    },
    tableContainer: {
        position: "relative"
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
    const [urineScreenTypes, setUrineScreenTypes] = React.useState([]);
    const [selectTypeLookup, setSelectTypeLookup] = React.useState({});
    const [urineScreenTypesInitialized, setUrineScreenTypesInitialized] = React.useState(false);
    const [lastUrineScreenDate, setLastUrineScreenDate] = React.useState("");
    const [lastType, setLastType] = React.useState("");
    const [dateInput, setDateInput] = React.useState(null);
    const [history, setHistory] = React.useState([]);
    const [addInProgress, setAddInProgress] = React.useState(false);
    const [updateInProgress, setUpdateInProgress] = React.useState(false);
    const [error, setError] = React.useState("");
    const [snackOpen, setSnackOpen] = React.useState(false);
    const [historyInitialized, setHistoryInitialized] = React.useState(false);
    const [showHistory, setShowHistory] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    const [editType, setEditType] = React.useState("");
    const [editDate, setEditDate] = React.useState("");
    const URINE_SCREEN_TYPE_LABEL = "Urine Drug Screen Name";
    const rowData = props.rowData ? props.rowData : {};
    const clearDate = () => {
        setDate(null);
        setDateInput("");
    };
    const clearHistory = () => {
        setHistory([]);
        setLastType("");
        setLastEntryId(null);
        setLastUrineScreenDate("");
    };
    const resetEdits = () => {
        setEditType("");
        setEditDate(null);
    };
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
    };
    const hasValues = () => {
        return type && date;
    };
    const hasError = () => {
        return error !== "";
    };
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
                clearHistory();
                setTimeout(() => {
                    setEditMode(false);
                    setHistoryInitialized(true);
                }, 300);
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
                const formattedData = createHistoryData(urineScreenData);
                setHistory(formattedData);
                const resourceType = formattedData[0].type;
                const resourceDate = formattedData[0].date;
                setLastUrineScreenDate(resourceDate);
                setLastType(resourceType);
                setLastEntryId(formattedData[0].id);
                resetEdits();
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
        handleUpdate(params, () => {
            clearFields();
            setTimeout(() => setAddInProgress(false), 250);
        });
    };
    const submitDataFormatter = (params) => {
        params = params || {};
        const testType = params.type ? params.type : type;
        const testDate = params.date ? params.date : dateInput;
        let typeMatch = urineScreenTypes.filter(item => {
            return item.code === testType;
        });
        var resource =  {
            "authoredOn": padDateString(testDate),
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
                "reference": "Patient/"+(params.patientId ? params.patientId : rowData.id)
            }
        };
        //include id if present, necessary for PUT request
        if (params.id) {
            resource = {...resource, ...{"id": params.id}};
        }
        return resource;
    }
    const handleUpdate = (params, callback) => {
        params = params || {};
        callback = callback || function() {};
        const testType = params.type ? params.type : type;
        const testDate = params.date ? params.date : dateInput;
        let typeMatch = urineScreenTypes.filter(item => {
            return item.code === testType;
        });
        if (String(params.method).toLowerCase() !== "delete") {
            if(!testType || !typeMatch.length) {
                setError("Unknown urine screen type " + testType);
                callback();
                return false;
            }
            if (!testDate) {
                setError("Missing urine screen date");
                callback();
                return false;
            }
        }
        let resource = submitDataFormatter(params);
        setError("");
        fetchData("/fhir/ServiceRequest"+(params.id?"/"+params.id:""), {
            "method": params.method ? params.method : "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                cache: "no-cache"
            },
            body: JSON.stringify(resource)
        }, (e) => {
            if (e) {
                handleSubmissionError();
            }
            callback(e);
        })
        .then(() => {
            setSnackOpen(true);
            setTimeout(() => {
                getHistory(urineScreenTypes, callback);
            }, 150);
        }).catch(e => {
            callback(e);
            console.log("error submtting request ", e);
            handleSubmissionError();
        });
    };
    const handleEditSave = (params) => {
        params = params || {};
        if (!Object.keys(params).length) params = {
            id: lastEntryId,
            date: editDate,
            type: editType
        };
        setUpdateInProgress(true);
        handleUpdate({...params, ...{
            method:"PUT"
        }}, () => setTimeout(setUpdateInProgress(false), 350));
    };
    const handleDelete = (params) => {
        params = params || {};
        if (!Object.keys(params).length) params = {
            id: lastEntryId,
            date: editDate,
            type: editType
        };
        setUpdateInProgress(true);
        handleUpdate({...params, ...{
            method:"DELETE"
        }}, () => setTimeout(setUpdateInProgress(false), 350));
    };
    const handleSubmissionError = () => {
        setError("Data submission failed. Unable to process your request.");
        setSnackOpen(false);
    };
    const handleEnableEditMode = () => {
        setEditType(lastType);
        setEditDate(lastUrineScreenDate);
        setError("");
        setEditMode(true);
    };
    const handleDisableEditMode = () => {
        resetEdits();
        setError("");
        setEditMode(false);
    };
    const isValidEditType = () => {
        if (onlyOneUrineScreenType()) return true;
        return editType;
    };
    const isValidEditDate = () => {
        let dateObj = new Date(editDate).setHours(0,0,0,0);
        let today = new Date().setHours(0,0,0,0);
        return isValid(dateObj) && !(dateObj > today);
    };
    const hasValidEditEntry = () => {
        return isValidEditType() && isValidEditDate();
    };
    const handleEditChange = (event) => {
        setEditDate(event.target.value);
    };
    const hasHistory = () => {
        return (history && history.length > 0);
    };
    const createHistoryData = (data) => {
        if (!data) return [];
        return data.map((item,index) => {
            const resource = item.resource;
            if (!resource) return {};
            let text = resource.code ? resource.code.text : "";
            let date = getShortDateFromISODateString(resource.authoredOn);
            let type = resource.code && resource.code.coding && resource.code.coding.length ? resource.code.coding[0].code : "";
            return {
                id: resource.id,
                type: type,
                text: text,
                date: date,
                index: index,
                patientId: rowData.id
            };
        });
    };
    const displayHistory = () => {
        if (!hasHistory()) return "";
        if (history[0].text) return history[0].text + " ordered on <b>" + lastUrineScreenDate + "</b>";
        return "Ordered on <b>" + lastUrineScreenDate + "</b>";
    };
    const displayEditHistoryByRow = (index, selectType, selectDate) => {
        if (!hasHistory()) return null;
        if (!index) index = 0;
        selectType = selectType || history[index].type;
        selectDate = selectDate || getShortDateFromISODateString(history[index].date);
        const orderText = history[index].text ? history[index].text : "";
        return (
            <React.Fragment>
                {onlyOneUrineScreenType()?
                            orderText:
                            <FormControl>
                                <Select
                                defaultValue={selectType}
                                onChange={handleEditTypeChange}
                                className={classes.selectBox}
                                IconComponent={() => <ArrowDropDownIcon color="primary"></ArrowDropDownIcon>}
                                error={hasError()}
                                >
                                {getUrineScreenTypeSelectList()}
                                </Select>
                                <FormHelperText>{`(${URINE_SCREEN_TYPE_LABEL})`}</FormHelperText>
                            </FormControl>
                            }
                <span> ordered on </span>
                <div style={{display: "inline-block"}}> <FormattedInput
                    defaultValue={selectDate}
                    helperText="(YYYY-MM-DD)"
                    disableFocus={!onlyOneUrineScreenType()}
                    handleChange={(e) => handleEditChange(e)}
                    handleKeyDown={(e) => handleEditSave(e)}
                    inputClass={{input: classes.editInput}}
                    error={hasError()}></FormattedInput></div>
            </React.Fragment>
        );
      };
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
                let types = {};
                data["UDS_LAB_TYPES"].forEach(item => {
                    types[item.code] = item.text;
                });
                setSelectTypeLookup(types);
            }
            setTimeout(() => setUrineScreenTypesInitialized(true), 150);
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
        });
    };
    const columns = [
        {
            field: "id",
            hidden: true
        },
        {
            title: "Urine Drug Screen Name",
            field: "type",
            emptyValue: "--",
            cellStyle: {
                "padding": "4px 24px 4px 16px"
            },
            lookup: selectTypeLookup,
            editable: !onlyOneUrineScreenType() ? "always" : "never"
        },
        {
            title: "Order Date",
            field: "date",
            emptyValue: "--",
            cellStyle: {
                "padding": "4px 24px 4px 16px"
            },
            editComponent: params => <FormattedInput defaultValue={params.value} handleChange={e => params.onChange(e.target.value)}></FormattedInput>
        },
    ];
    React.useEffect(() => {
        initUrineScreenTypes();
    }, [!urineScreenTypesInitialized]);
    React.useEffect(() => {
        if (onlyOneUrineScreenType()) {
            //set urine screen type if only one available
            setType(urineScreenTypes[0].code);
        }
        getHistory();
    },[urineScreenTypesInitialized]);
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
                <Paper className={classes.addContainer} elevation={1}>
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
                        {!urineScreenTypesInitialized && <div className={classes.progressContainer}><CircularProgress className={classes.progressIcon} color="primary" size={28} /></div>}
                        {urineScreenTypesInitialized && <div>
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
                </Paper>
                {/* history */}
                <Paper className={classes.historyContainer} elevation={1}>
                    {!historyInitialized && <div className={classes.progressContainer}>
                        <CircularProgress color="primary" size={32} className={classes.progressIcon} />
                    </div>}
                    {updateInProgress && <div className={classes.progressContainer}><CircularProgress className={classes.progressIcon} color="primary" size={28} /></div>}
                    <Typography variant="caption" display="block" className={classes.historyTitle}>
                        Last Urine Drug Screen
                    </Typography>
                    {historyInitialized && hasHistory() && <div>
                        {!editMode && <span dangerouslySetInnerHTML={{ __html: displayHistory()}}></span>}
                        {editMode && displayEditHistoryByRow(0)}
                        <EditButtonGroup
                            onEnableEditMode={handleEnableEditMode}
                            onDisableEditMode={handleDisableEditMode}
                            isUpdateDisabled={!hasValidEditEntry()}
                            handleEditSave={() => handleEditSave()}
                            handleDelete={() => handleDelete()}
                            entryDescription={displayHistory()}
                        ></EditButtonGroup>
                    </div>}
                    {!isAdult(rowData.dob) && !hasHistory() && <div>No previously recorded urine drug screen</div>}
                    {/* alerts */}
                    {isAdult(rowData.dob) && <OverdueAlert date={lastUrineScreenDate}  type="urine drug screen"></OverdueAlert>}
                </Paper>
                { hasHistory() && historyInitialized && <Paper className={classes.historyContainer} elevation={1}>
                    <Typography variant="caption" display="block" className={classes.historyTitle}>
                        History
                    </Typography>
                    <div className={classes.totalEntriesContainer}>
                        <span><b>{history.length}</b> record(s)</span>
                        {!showHistory && <Button
                            arial-label="expand"
                            color="primary"
                            onClick={() => setShowHistory(true)}
                            endIcon={<ExpandMoreIcon className={classes.endIcon}></ExpandMoreIcon>}
                            size="small"
                            className={classes.expandIcon}>View</Button>}
                        {showHistory && <Button
                            arial-label="collapse"
                            color="primary"
                            onClick={() => setShowHistory(false)}
                            endIcon={<ExpandLessIcon className={classes.endIcon}></ExpandLessIcon>}
                            size="small"
                            className={classes.expandIcon}>Hide</Button>}
                    </div>
                    <div className={classes.tableContainer}>
                        {showHistory && <div className="history-table"><HistoryTable
                        data={history}
                        columns={columns}
                        APIURL="/fhir/ServiceRequest/"
                        submitDataFormatter={submitDataFormatter}
                        onRowUpdate={() => getHistory()}
                        onRowDelete={() => getHistory()}
                    ></HistoryTable></div>}
                    </div>
                </Paper>}
                {/* feedback snack popup */}
                <Snackbar open={snackOpen} autoHideDuration={3000} onClose={handleSnackClose}>
                    <Alert onClose={handleSnackClose} severity="success">Request processed successfully.</Alert>
                </Snackbar>
                {/* error message UI */}
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
