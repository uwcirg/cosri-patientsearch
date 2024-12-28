import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import makeStyles from "@mui/styles/makeStyles";
import isValid from "date-fns/isValid";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import InputLabel from "@mui/material/InputLabel";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Alert from "./Alert";
import EditButtonGroup from "./EditButtonGroup";
import Error from "./Error";
import FormattedInput from "./FormattedInput";
import OverdueAlert from "./OverdueAlert";
import HistoryTable from "./HistoryTable";
import {
  sendRequest,
  dateTimeCompare,
  fetchData,
  getShortDateFromISODateString,
  isAdult,
  padDateString,
} from "../helpers/utility";
const LOINC_SYSTEM_URL = "https://loinc.org";
const CONTRACT_CODE = "94136-9";
const useStyles = makeStyles((theme) => ({
  container: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1)
  },
  contentContainer: {
    position: "relative",
  },
  addContainer: {
    position: "relative",
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
  },
  addTitle: {
    display: "inline-block",
    color: theme.palette.dark ? theme.palette.dark.main : "#444",
    fontWeight: 500,
    borderBottom: `2px solid ${theme.palette.primary.lightest}`,
    marginBottom: theme.spacing(2.5),
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
    zIndex: 99,
  },
  progressIcon: {
    position: "absolute",
    top: "15%",
    left: "15%",
  },
  addButton: {
    marginRight: theme.spacing(1),
  },
  editInput: {
    width: theme.spacing(10),
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
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    minHeight: theme.spacing(9),
  },
  historyTitle: {
    display: "inline-block",
    color: theme.palette.dark ? theme.palette.dark.main : "#444",
    fontWeight: 500,
    borderBottom: `2px solid ${theme.palette.primary.lightest}`,
    marginBottom: theme.spacing(1),
  },
  errorContainer: {
    maxWidth: "100%",
    marginTop: theme.spacing(3),
  },
  totalEntriesContainer: {
    marginTop: theme.spacing(1),
  },
  expandIcon: {
    marginLeft: theme.spacing(2),
    verticalAlign: "middle",
    fontSize: "12px",
  },
  endIcon: {
    marginLeft: "-4px",
    position: "relative",
  },
  tableContainer: {
    position: "relative",
  },
}));

export default function Agreement(props) {
  const classes = useStyles();
  const [editDate, setEditDate] = React.useState(null);
  const [editMode, setEditMode] = React.useState(false);
  const lastEntryReducer = (state, action) => {
    if (action.type == "reset") {
      return {
        id: null,
        date: "",
      };
    }
    if (action.type === "update") {
      return {
        ...state,
        ...action.data,
      };
    }
    return state;
  };
  const [lastEntry, lastEntryDispatch] = React.useReducer(lastEntryReducer, {
    id: null,
    date: "",
  });
  const [dateInput, setDateInput] = React.useState(null);
  const [addInProgress, setAddInProgress] = React.useState(false);
  const [updateInProgress, setUpdateInProgress] = React.useState(false);
  const [historyInitialized, setHistoryInitialized] = React.useState(false);
  const [history, setHistory] = React.useState([]);
  const [expandHistory, setExpandHistory] = React.useState(false);
  const [error, setError] = React.useState("");
  const [snackOpen, setSnackOpen] = React.useState(false);
  const { rowData } = props;
  const getPatientId = React.useCallback(
    () => (rowData ? rowData.id : ""),
    [rowData]
  );
  const clearDate = () => {
    setDateInput(null);
  };
  const clearFields = () => {
    clearDate();
    setError("");
  };
  const clearHistory = () => {
    setHistory([]);
    lastEntryDispatch({ type: "reset" });
  };
  const hasValues = () => {
    return !!dateInput;
  };
  const hasError = () => {
    return !!error;
  };
  const submitDataFormatter = (params) => {
    params = params || {};
    const resourceId = params.id || "";
    const contractDate = params.date || dateInput;
    return {
      id: resourceId,
      type: {
        coding: [
          {
            system: params.system ? params.system : LOINC_SYSTEM_URL,
            code: params.code ? params.code : CONTRACT_CODE,
            display: "Controlled substance agreement",
          },
        ],
      },
      subject: {
        reference:
          "Patient/" + (params.patientId ? params.patientId : getPatientId()),
      },
      resourceType: "DocumentReference",
      date: padDateString(contractDate),
    };
  };
  const handleUpdate = (params, callback) => {
    params = params || {};
    callback = callback || function () {};
    const resourceId = params.id || null;
    const method = params.method || "POST";
    const contractDate =
      params.date ||
      (dayjs.isDayjs(dateInput) ? dateInput.format("YYYY-MM-DD") : dateInput);
    if (String(params.method).toLowerCase() !== "delete" && !contractDate) {
      setError("No contract date provided.");
      callback();
      return false;
    }
    setError("");
    let resource = submitDataFormatter(params);
    fetchData(
      "/fhir/DocumentReference" + (resourceId ? "/" + resourceId : ""),
      {
        method: method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          cache: "no-cache",
        },
        body: JSON.stringify(resource),
      },
      (e) => {
        if (e) {
          handleSubmissionError();
        }
        callback(e);
      }
    )
      .then(() => {
        setSnackOpen(true);
        setTimeout(() => getHistory(callback), 150);
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
  };
  const handleAdd = (params) => {
    setAddInProgress(true);
    handleUpdate(params, () => {
      clearFields();
      setTimeout(() => {
        setAddInProgress(false);
      }, 250);
    });
  };
  const handleEditSave = (params) => {
    params = params || {};
    if (!Object.keys(params).length)
      params = {
        id: lastEntry.id,
        date: editDate || lastEntry.date,
      };
    setUpdateInProgress(true);
    handleUpdate(
      {
        ...params,
        ...{
          method: "PUT",
        },
      },
      () => setTimeout(setUpdateInProgress(false), 250)
    );
  };
  const handleDelete = (params) => {
    params = params || {};
    if (!Object.keys(params).length)
      params = {
        id: lastEntry.id,
        date: editDate ? editDate : lastEntry.date,
      };
    setUpdateInProgress(true);
    handleUpdate(
      {
        ...params,
        ...{
          method: "DELETE",
        },
      },
      () => setTimeout(setUpdateInProgress(false), 250)
    );
  };
  const handleSubmissionError = () => {
    setError("Data submission failed. Unable to process your request.");
    setSnackOpen(false);
    setHistoryInitialized(true);
  };
  const hasHistory = () => {
    return history && history.length > 0;
  };
  const createHistoryData = React.useCallback(
    (data) => {
      if (!data) return [];
      return data.map((item, index) => {
        const resource = item.resource;
        if (!resource) return {};
        let date = getShortDateFromISODateString(resource.date);
        return {
          id: resource.id,
          date: date,
          index: index,
          patientId: getPatientId(),
          system: LOINC_SYSTEM_URL,
          code: CONTRACT_CODE,
        };
      });
    },
    [getPatientId]
  );
  const getHistory = React.useCallback(
    (callback) => {
      callback = callback || function () {};
      if (!rowData) {
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
            callback();
            setEditMode(false);
            setHistoryInitialized(true);
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
            const formattedData = createHistoryData(agreementData);
            setEditDate(null);
            setHistory(formattedData);
            lastEntryDispatch({
              type: "update",
              data: {
                id: formattedData[0].id,
                date: formattedData[0].date,
              },
            });
          } else clearHistory();
          setEditMode(false);
          setHistoryInitialized(true);
          callback();
        },
        (error) => {
          setHistoryInitialized(true);
          callback(error);
          console.log("Failed to retrieve data", error);
        }
      );
      return "";
    },
    [rowData, createHistoryData]
  );
  const displayMostRecent = () => {
    if (!hasHistory()) return "";
    return (
      "Last controlled substance agreement signed on <b>" +
      lastEntry.date +
      "</b>"
    );
  };
  const displayEditHistory = () => {
    if (!hasHistory()) return null;
    return (
      <div style={{ display: "inline-block" }}>
        Last controlled substance agreement signed on{" "}
        <FormattedInput
          defaultValue={lastEntry.date}
          helperText="(YYYY-MM-DD)"
          inputClass={{ input: classes.editInput }}
          handleChange={(e) => handleEditChange(e)}
          handleKeyDown={() => handleEditSave()}
          error={hasError()}
        ></FormattedInput>
      </div>
    );
  };
  const handleEnableEditMode = () => {
    setEditDate(lastEntry.date);
    setError("");
    setEditMode(true);
  };
  const handleDisableEditMode = () => {
    setError("");
    setEditDate(null);
    setEditMode(false);
  };
  const handleEditChange = (event) => {
    setEditDate(event.target.value);
  };
  const isValidEditDate = () => {
    let dateObj = new Date(editDate).setHours(0, 0, 0, 0);
    let today = new Date().setHours(0, 0, 0, 0);
    return isValid(dateObj) && !(dateObj > today);
  };
  const handleSnackClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackOpen(false);
  };
  const columns = [
    {
      field: "id",
      hidden: true,
    },
    {
      title: "Agreement Date",
      field: "date",
      emptyValue: "--",
      cellStyle: {
        padding: "4px 24px 4px 16px",
      },
      editComponent: (params) => (
        <FormattedInput
          defaultValue={params.value}
          handleChange={(e) => params.onChange(e.target.value)}
        ></FormattedInput>
      ),
    },
  ];
  const renderTitle = () => (
    <h3>{`Controlled Substance Agreement for ${rowData.first_name} ${rowData.last_name}`}</h3>
  );

  const renderAddInProgressIndicator = () => {
    if (!addInProgress) return null;
    return (
      <div className={classes.progressContainer}>
        <CircularProgress
          className={classes.progressIcon}
          color="primary"
          size={32}
        />
      </div>
    );
  };
  const renderAddComponent = () => (
    <Paper className={classes.addContainer} elevation={1}>
      <Typography
        variant="caption"
        display="block"
        className={classes.addTitle}
      >
        Add New
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {/* order date field */}
        <InputLabel className={classes.dateLabel}>Agreement Date</InputLabel>
        <DatePicker
          autoOk={true}
          variant="dialog"
          openTo="year"
          disableFuture
          slotProps={{
            textField: {
              placeholder: "YYYY-MM-DD",
              InputLabelProps: { shrink: true },
              variant: "standard",
              className: classes.dateInput
            },
          }}
          // renderInput={(props) => (
          //   <TextField
          //     {...props}
          //     inputProps={{
          //       placeholder: "MM-DD-YYYY",
          //     }}
          //     inputFormat="MM-DD-YYYY"
          //     className={classes.dateInput}
          //     variant="standard"
          //   />
          // )}
          clearable={true}
          format="YYYY-MM-DD"
          minDate={dayjs("1950-01-01")}
          invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
          maxDateMessage="Date must not be in the future"
          value={dateInput?dayjs(dateInput):null}
          orientation="landscape"
          onKeyDown={(event) => handleKeyDownAdd(event)}
          onChange={(dateString, validationContext) => {
            if (validationContext?.validationError) {
              setDateInput(dateString.format());
              return;
            }
            setDateInput(dateString ? dateString.format("YYYY-MM-DD") : null);
          }}
          KeyboardButtonProps={{ color: "primary", title: "Date picker" }}
          autoFocus
        />
      </LocalizationProvider>
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
    </Paper>
  );
  const renderUpdateInProgressIndicator = () => (
    <div className={classes.progressContainer}>
      <CircularProgress
        color="primary"
        size={32}
        className={classes.progressIcon}
      />
    </div>
  );
  const renderMostRecentHistory = () => (
    <React.Fragment>
      <Typography
        variant="caption"
        display="block"
        className={classes.historyTitle}
        gutterBottom
      >
        Latest Controlled Substance Agreement
      </Typography>
      {!hasHistory() && (
        <div>No previously recorded controlled substance agreement</div>
      )}
      {/* most recent entry */}
      {hasHistory() && (
        <div>
          <div>
            {!editMode && (
              <span
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(displayMostRecent()),
                }}
              ></span>
            )}
            {editMode && displayEditHistory()}
            <EditButtonGroup
              onEnableEditMode={handleEnableEditMode}
              onDisableEditMode={handleDisableEditMode}
              isUpdateDisabled={!isValidEditDate()}
              handleEditSave={() => handleEditSave()}
              handleDelete={() => handleDelete()}
              entryDescription={`Controlled substance agreement signed on <b>${lastEntry.date}</b>`}
            ></EditButtonGroup>
          </div>
          {/* alerts */}
          {isAdult(rowData.birth_date) && (
            <OverdueAlert
              date={lastEntry.date}
              type="controlled substance agreement"
              overdueMessage="It has been more than 12 months since the patient has signed a controlled substance agreement."
            ></OverdueAlert>
          )}
        </div>
      )}
    </React.Fragment>
  );
  const renderHistory = () => (
    <Paper className={classes.historyContainer} elevation={1}>
      <div className={classes.totalEntriesContainer}>
        <Typography
          variant="caption"
          display="block"
          className={classes.historyTitle}
        >
          History
        </Typography>
        <div>
          <span>
            <b>{history.length}</b> record(s)
          </span>
          {!expandHistory && (
            <Button
              arial-label="expand"
              color="primary"
              onClick={() => setExpandHistory(true)}
              endIcon={
                <ExpandMoreIcon className={classes.endIcon}></ExpandMoreIcon>
              }
              size="small"
              className={classes.expandIcon}
            >
              View
            </Button>
          )}
          {expandHistory && (
            <Button
              arial-label="collapse"
              color="primary"
              onClick={() => setExpandHistory(false)}
              endIcon={
                <ExpandLessIcon className={classes.endIcon}></ExpandLessIcon>
              }
              size="small"
              className={classes.expandIcon}
            >
              Hide
            </Button>
          )}
        </div>
      </div>
      <div className={classes.tableContainer}>
        {expandHistory && (
          <div className="history-table">
            <HistoryTable
              data={history}
              columns={columns}
              APIURL="/fhir/DocumentReference/"
              submitDataFormatter={submitDataFormatter}
              onRowUpdate={() => getHistory()}
              onRowDelete={() => getHistory()}
              options={{
                actionsCellStyle: {
                  width: "80%",
                  textAlign: "left",
                },
              }}
            ></HistoryTable>
          </div>
        )}
      </div>
    </Paper>
  );
  const renderFeedbackSnackbar = () => (
    <Snackbar
      open={snackOpen}
      autoHideDuration={2000}
      onClose={handleSnackClose}
    >
      <div>
        <Alert
          onClose={handleSnackClose}
          severity="success"
          message="Request processed successfully."
        ></Alert>
      </div>
    </Snackbar>
  );
  const renderError = () => (
    <div className={classes.errorContainer}>
      {error && <Error message={error}></Error>}
    </div>
  );

  React.useEffect(() => {
    getHistory();
  }, [getHistory]);

  return (
    <div className={classes.container}>
      <div className={classes.contentContainer}>
        {renderTitle()}
        {renderAddInProgressIndicator()}
        {/* add new agreement UI */}
        {renderAddComponent()}
        {/* history UI */}
        <Paper className={classes.historyContainer} elevation={1}>
          {(!historyInitialized || updateInProgress) &&
            renderUpdateInProgressIndicator()}
          {historyInitialized && renderMostRecentHistory()}
        </Paper>
        {hasHistory() && renderHistory()}
        {/* submission feedback UI */}
        {renderFeedbackSnackbar()}
        {renderError()}
      </div>
    </div>
  );
}

Agreement.propTypes = {
  rowData: PropTypes.object.isRequired,
};
