import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import DateFnsUtils from "@date-io/date-fns";
import isValid from "date-fns/isValid";
import ClearIcon from "@material-ui/icons/Clear";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import InputLabel from "@material-ui/core/InputLabel";
import Snackbar from "@material-ui/core/Snackbar";
import Typography from "@material-ui/core/Typography";
import MuiAlert from "@material-ui/lab/Alert";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import EditButtonGroup from "./EditButtonGroup";
import Error from "./Error";
import FormattedInput from "./FormattedInput";
import OverdueAlert from "./OverdueAlert";
import {
  sendRequest,
  dateTimeCompare,
  fetchData,
  getShortDateFromISODateString,
  isAdult,
} from "./Utility";
import theme from "../context/theme";
const LOINC_SYSTEM_URL = "https://loinc.org";
const CONTRACT_CODE = "94136-9";
const useStyles = makeStyles({
  container: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    paddingTop: theme.spacing(1),
  },
  contentContainer: {
    position: "relative"
  },
  addContainer: {
    position: "relative",
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    border: `2px solid ${theme.palette.muted.light}`
  },
  buttonsContainer: {
    marginTop: theme.spacing(2),
    position: "relative",
  },
  progressContainer: {
   position: "absolute",
   left: 0,
   right: 0,
   top: 0,
   bottom: 0,
   background: "hsl(0deg 0% 100% / 80%)",
   zIndex: 99
  },
  progressIcon: {
    position: "absolute",
    top: "15%",
    left: "15%"
  },
  addButton: {
    marginRight: theme.spacing(1),
  },
  editInput: {
    width: theme.spacing(10)
  },
  dateInput: {
    minWidth: "248px",
  },
  dateLabel: {
    fontSize: "12px",
    marginBottom: theme.spacing(0.25),
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
  errorContainer: {
    maxWidth: "100%",
    marginTop: theme.spacing(3),
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

export default function Agreement(props) {
  const classes = useStyles();
  const [date, setDate] = React.useState(null);
  const [editDate, setEditDate] = React.useState(null);
  const [editMode, setEditMode] = React.useState(false);
  const [lastEntryId, setLastEntryId] = React.useState(null);
  const [lastAgreementDate, setLastAgreementDate] = React.useState("");
  const [dateInput, setDateInput] = React.useState(null);
  const [addInProgress, setAddInProgress] = React.useState(false);
  const [updateInProgress, setUpdateInProgress] = React.useState(false);
  const [historyInitialized, setHistoryInitialized] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [error, setError] = React.useState("");
  const [snackOpen, setSnackOpen] = React.useState(false);
  const clearDate = () => {
    setDate(null);
    setDateInput("");
  };
  const clearFields = () => {
    clearDate();
    setError("");
  };
  const clearHistory = () => {
    setHistory([]);
    setLastEntryId(null);
    setLastAgreementDate("");
  };
  const hasValues = () => {
    return date;
  };
  const hasError = () => {
    return error !== "";
  };
  const rowData = props.rowData ? props.rowData : {};
  const handleUpdate = (params, callback) => {
    params = params || {};
    callback = callback || function() {};
    const resourceId = params.id || null;
    const method = params.method || "POST";
    const contractDate = params.contractDate || date;
    setError("");
    let resource = {
      id: resourceId,
      type: {
        coding: [
          {
            system: LOINC_SYSTEM_URL,
            code: CONTRACT_CODE,
            display: "Controlled substance agreement",
          },
        ],
      },
      subject: {
        reference: "Patient/" + rowData.id,
      },
      resourceType: "DocumentReference",
      date: contractDate,
    };
    fetchData("/fhir/DocumentReference"+(resourceId?"/"+resourceId:""), {
      method: method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-cache",
      body: JSON.stringify(resource),
    }, (e) => {
      if (e) {
        handleSubmissionError();
      }
      callback(e);
    })
      .then(() => {
        setSnackOpen(true);
        clearFields();
        setTimeout(() => getHistory(callback), 50);
      })
      .catch((e) => {
        console.log("error submtting request ", e);
        handleSubmissionError();
        callback(e);
        return false;
      });
    return false;
  };
  const handleKeyDownAdd = (event) => {
    if (String(event.key).toLowerCase() === "enter") {
      handleAdd();
    }
    return false;
  }
  const handleAdd = (params) => {
    setAddInProgress(true);
    handleUpdate(params, () =>  setTimeout(() => setAddInProgress(false), 250));
  };
  const handleSubmissionError = () => {
    setError("Data submission failed. Unable to process your request.");
    setSnackOpen(false);
    setHistoryInitialized(true);
  };
  const handleSnackClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackOpen(false);
  };
  const hasHistory = () => {
    return history && history.length > 0;
  };
  const getHistory = (callback) => {
    callback = callback || function() {};
    if (!rowData || !rowData.id) {
      setHistoryInitialized(true);
      callback();
      return [];
    }
    setHistoryInitialized(false);
    /*
     * retrieve agreement history
     */
    sendRequest(
      "/fhir/DocumentReference?patient=" + rowData.id + "&_sort=-date",
      { nocache: true }
    ).then(
      (response) => {
        let data = null;
        try {
          data = JSON.parse(response);
        } catch (e) {
          console.log("Error parsing pain agreement request data ", e);
        }
        if (!data || !data.entry || !data.entry.length) {
          clearHistory();
          setEditMode(false);
          callback();
          setTimeout(() => setHistoryInitialized(true), 300);
          return;
        }
        let agreementData = data.entry.filter((item) => {
          let resource = item.resource;
          if (!resource) return false;
          if (
            !resource.type ||
            !resource.type.coding ||
            !resource.type.coding.length
          )
            return false;
          return resource.type.coding[0].code === CONTRACT_CODE;
        });
        agreementData = agreementData.sort(function (a, b) {
          return dateTimeCompare(a.resource.date, b.resource.date);
        });
        if (agreementData.length) {
          setHistory(agreementData);
          setLastEntryId(agreementData[0].resource.id);
          const resourceDate = getShortDateFromISODateString(agreementData[0].resource.date);
          setLastAgreementDate(resourceDate);
          setEditDate(resourceDate);
        } else clearHistory();
        setTimeout(() => {
          setEditMode(false);
          setHistoryInitialized(true);
        }, 300);
        callback();
      },
      (error) => {
        setHistoryInitialized(true);
        callback(error);
        console.log("Failed to retrieve data", error);
      }
    );
    return "";
  };
  const displayHistory = () => {
    if (!hasHistory()) return "";
    return (
      "Last controlled substance agreement signed on <b>" +
      lastAgreementDate +
      "</b>"
    );
  };
  const displayEditHistory = () => {
    if (!hasHistory()) return null;
    return (
      <div style={{display: "inline-block"}}>Last controlled substance agreement signed on <FormattedInput value={editDate}
      helperText="(YYYY-MM-DD)"
      inputClass={{input: classes.editInput}}
      handleChange={(e) => handleEditChange(e)}
      handleKeyDown={(e) => handleEditSave(e)}
      error={hasError()}></FormattedInput></div>
    );
  };
  const handleEnableEditMode = () => {
    setError("");
    setEditMode(true);
  };
  const handleDisableEditMode = () => {
    setError("");
    setEditDate(lastAgreementDate);
    setEditMode(false);
  };
  const handleEditChange = (event) => {
    setEditDate(event.target.value);
  };
  const isValidEditDate = () => {
    return isValid(new Date(editDate));
  };
  const handleEditSave = () => {
    setUpdateInProgress(true);
    handleUpdate({
      method: "PUT",
      id: lastEntryId,
      contractDate: editDate
    }, () => {
      setTimeout(setUpdateInProgress(false), 350);
    });
  };
  const handleDelete = () => {
    setUpdateInProgress(true);
    handleUpdate({
      method: "DELETE",
      id: lastEntryId,
      contractDate: lastAgreementDate
    }, () => {
      setTimeout(setUpdateInProgress(false), 350);
    });
  };
  React.useEffect(() => {
    getHistory();
  }, []);
  return (
    <div className={classes.container}>
      <div className={classes.contentContainer}>
        {addInProgress && (
          <div className={classes.progressContainer}>
            <CircularProgress
              className={classes.progressIcon}
              color="primary"
              size={32}
            />
          </div>
        )}
        <h3>{`Controlled Substance Agreement for ${rowData.first_name} ${rowData.last_name}`}</h3>
        {/* add new agreement UI */}
        <div className={classes.addContainer}>
          <Typography variant="caption" display="block" className={classes.addTitle}>
              Add New
          </Typography>
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
                  <InputAdornment
                    position="end"
                    style={{ order: 1, marginLeft: 0 }}
                  >
                    <IconButton
                      onClick={() => {
                        clearDate();
                      }}
                      style={{ order: 2, padding: 0 }}
                      aria-label="Clear date"
                      title="Clear date"
                    >
                      <ClearIcon color="primary" fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                className: classes.dateInput,
              }}
              format="yyyy-MM-dd"
              minDate={new Date("1950-01-01")}
              invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
              maxDateMessage="Date must not be in the future"
              placeholder="YYYY-MM-DD"
              value={date}
              orientation="landscape"
              onKeyDown={(event) => handleKeyDownAdd(event)}
              onChange={(event, dateString) => {
                setDateInput(dateString);
                if (!event || !isValid(event)) {
                  if (event && String(dateInput).replace(/[-_]/g, "").length >= 8)
                    setDate(event);
                  return;
                }
                setDate(event);
              }}
              KeyboardButtonProps={{ color: "primary", title: "Date picker" }}
              autoFocus
            />
          </MuiPickersUtilsProvider>
          <div className={classes.buttonsContainer}>
            <Button
              variant="contained"
              color="primary"
              className={classes.addButton}
              disabled={!hasValues()}
              onClick={() => handleAdd()}
            >
              Add
            </Button>
            <Button
              variant="outlined"
              onClick={clearFields}
              disabled={!hasValues()}
            >
              Clear
            </Button>
          </div>
        </div>
        {/* submission feedback UI */}
        <Snackbar open={snackOpen} autoHideDuration={3000} onClose={handleSnackClose}>
          <Alert onClose={handleSnackClose} severity="success">
            Request processed successfully.
          </Alert>
        </Snackbar>
        {/* history UI */}
        <div className={classes.historyContainer}>
          {!historyInitialized && <div className={classes.progressContainer}>
            <CircularProgress color="primary" size={32} className={classes.progressIcon} />
          </div>}
          {updateInProgress && <div className={classes.progressContainer}>
            <CircularProgress color="primary" size={32} className={classes.progressIcon}/>
          </div>}
          <Typography
            variant="caption"
            display="block"
            className={classes.historyTitle}
            gutterBottom
          >
            Latest Controlled Substance Agreement
          </Typography>
          <br />
          {historyInitialized && hasHistory() && !editMode && <span dangerouslySetInnerHTML={{ __html: displayHistory() }}></span>}
          {historyInitialized && hasHistory() && editMode && displayEditHistory()}
          {historyInitialized && hasHistory() &&
          <EditButtonGroup
            onEnableEditMode={handleEnableEditMode}
            onDisableEditMode={handleDisableEditMode}
            isUpdateDisabled={!isValidEditDate()}
            handleEditSave={handleEditSave}
            handleDelete={handleDelete}
            entryDescription={`Controlled substance agreement signed on <b>${lastAgreementDate}</b>`}
          ></EditButtonGroup>}
          {!isAdult(rowData.dob) && !hasHistory() && <div>No previously recorded controlled substance agreement</div>}
          {/* alerts */}
          {isAdult(rowData.dob) && (
            <OverdueAlert
              date={lastAgreementDate}
              type="controlled substance agreement"
              overdueMessage="It has been more than 12 months since the patient has signed a controlled substance agreement."
            ></OverdueAlert>
          )}
          {/* total record counts */}
          {hasHistory() && <div className={classes.totalEntriesContainer}><b>{history.length}</b> agreement record(s) found</div>}
        </div>
        <div className={classes.errorContainer}>
          {error && <Error message={error}></Error>}
        </div>
      </div>
    </div>
  );
}

Agreement.propTypes = {
  rowData: PropTypes.object.isRequired
};
