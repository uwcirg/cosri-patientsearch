import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import makeStyles from "@mui/styles/makeStyles";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import InputLabel from "@mui/material/InputLabel";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import PrintIcon from "@mui/icons-material/Print";
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
  isValidDateString,
  padDateString,
} from "../helpers/utility";
import { useSettingContext } from "../context/SettingContextProvider";

const LOINC_SYSTEM_URL = "https://loinc.org";
const CONTRACT_CODE = "94136-9";
const titleStyle = (theme) => ({
  color: theme.palette.dark ? theme.palette.dark.main : "#444",
  fontWeight: 500,
  borderBottom: `2px solid ${theme.palette.primary.lightest}`,
  width: "fit-content",
});
const useStyles = makeStyles((theme) => ({
  container: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  contentContainer: {
    position: "relative",
  },
  addContainer: {
    position: "relative",
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(2),
  },
  addTitle: {
    ...titleStyle(theme),
    display: "inline-block",
    marginBottom: theme.spacing(2),
  },
  printTitle: {
    ...titleStyle(theme),
    display: "inline-block",
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
    ...titleStyle(theme),
    display: "inline-block",
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

const initialState = {
  editDate: null,
  editMode: false,
  lastEntry: { id: null, date: "" },
  dateInput: null,
  addInProgress: false,
  updateInProgress: false,
  historyInitialized: false,
  history: [],
  expandHistory: false,
  error: "",
  snackOpen: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_EDIT_DATE":
      return { ...state, editDate: action.payload };
    case "SET_EDIT_MODE":
      return { ...state, editMode: action.payload };
    case "SET_DATE_INPUT":
      return { ...state, dateInput: action.payload };
    case "SET_ADD_IN_PROGRESS":
      return { ...state, addInProgress: action.payload };
    case "SET_UPDATE_IN_PROGRESS":
      return { ...state, updateInProgress: action.payload };
    case "SET_HISTORY_INITIALIZED":
      return { ...state, historyInitialized: action.payload };
    case "SET_HISTORY":
      return { ...state, history: action.payload };
    case "SET_EXPAND_HISTORY":
      return { ...state, expandHistory: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_SNACK_OPEN":
      return { ...state, snackOpen: action.payload };
    case "SET_LAST_ENTRY":
      return { ...state, lastEntry: { ...state.lastEntry, ...action.payload } };
    case "RESET_LAST_ENTRY":
      return { ...state, lastEntry: { id: null, date: "" } };
    // Compound actions for common multi-state updates
    case "ENABLE_EDIT_MODE":
      return {
        ...state,
        editDate: state.lastEntry.date,
        editMode: true,
        error: "",
      };
    case "DISABLE_EDIT_MODE":
      return { ...state, editDate: null, editMode: false, error: "" };
    case "CLEAR_FIELDS":
      return { ...state, dateInput: null, error: "" };
    case "CLEAR_HISTORY":
      return { ...state, history: [], lastEntry: { id: null, date: "" } };
    case "SUBMISSION_ERROR":
      return {
        ...state,
        error: "Data submission failed. Unable to process your request.",
        snackOpen: false,
        historyInitialized: true,
      };
    case "HISTORY_LOADED":
      return {
        ...state,
        history: action.payload.history,
        lastEntry: action.payload.lastEntry,
        editDate: null,
        editMode: false,
        historyInitialized: true,
      };
    default:
      return state;
  }
}

export default function Agreement(props) {
  const appCtx = useSettingContext();
  const appSettingsRef = React.useRef(appCtx.appSettings);
  const appSettings = appSettingsRef.current;
  const classes = useStyles();
  const enableAddNew = !!(appSettings && appSettings["ENABLE_ADD_NEW_CS"]);
  const enablePrintNew = !enableAddNew;

  const [state, dispatch] = React.useReducer(reducer, initialState);
  const {
    editDate,
    editMode,
    lastEntry,
    dateInput,
    addInProgress,
    updateInProgress,
    historyInitialized,
    history,
    expandHistory,
    error,
    snackOpen,
  } = state;

  const { rowData } = props;

  const getPatientId = React.useCallback(
    () => (rowData ? rowData.id : ""),
    [rowData],
  );

  const hasValues = () => !!dateInput;
  const hasError = () => !!error;

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
    const contractDate =
      params.date ||
      (dayjs.isDayjs(dateInput) ? dateInput.format("YYYY-MM-DD") : dateInput);

    if (!contractDate) {
      dispatch({ type: "SET_ERROR", payload: "No contract date provided." });
      callback({ error: true });
      return false;
    }

    const resourceId = params.id || null;
    const method = params.method || "POST";
    const matchedHistoryEntry = history?.find(
      (entry) => entry.date === contractDate,
    );
    if (
      ["POST", "PUT"].indexOf(String(method).toUpperCase()) >= 0 &&
      matchedHistoryEntry
    ) {
      callback();
      return;
    }

    dispatch({ type: "SET_ERROR", payload: "" });
    const resource = submitDataFormatter(params);

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
        if (e) dispatch({ type: "SUBMISSION_ERROR" });
        callback(e);
      },
    )
      .then(() => {
        dispatch({ type: "SET_SNACK_OPEN", payload: true });
        setTimeout(() => getHistory(callback), 150);
      })
      .catch((e) => {
        console.log("error submitting request ", e);
        dispatch({ type: "SUBMISSION_ERROR" });
        callback(e);
        return false;
      });

    return false;
  };

  const handleKeyDownAdd = (event) => {
    if (String(event.key).toLowerCase() === "enter") handleAdd();
    return false;
  };

  const handleAdd = (params) => {
    dispatch({ type: "SET_ADD_IN_PROGRESS", payload: true });
    handleUpdate(params, () => {
      dispatch({ type: "CLEAR_FIELDS" });
      setTimeout(
        () => dispatch({ type: "SET_ADD_IN_PROGRESS", payload: false }),
        250,
      );
    });
  };

  const handleEditSave = (params) => {
    params = params || {};
    if (!Object.keys(params).length)
      params = { id: lastEntry.id, date: editDate || lastEntry.date };
    dispatch({ type: "SET_UPDATE_IN_PROGRESS", payload: true });
    handleUpdate({ ...params, method: "PUT" }, () =>
      setTimeout(
        () => dispatch({ type: "SET_UPDATE_IN_PROGRESS", payload: false }),
        250,
      ),
    );
  };

  const handleDelete = (params) => {
    params = params || {};
    if (!Object.keys(params).length)
      params = { id: lastEntry.id, date: editDate || lastEntry.date };
    dispatch({ type: "SET_UPDATE_IN_PROGRESS", payload: true });
    handleUpdate({ ...params, method: "DELETE" }, () =>
      setTimeout(
        () => dispatch({ type: "SET_UPDATE_IN_PROGRESS", payload: false }),
        250,
      ),
    );
  };

  const createHistoryData = React.useCallback(
    (data) => {
      if (!data) return [];
      return data.map((item, index) => {
        const resource = item.resource;
        if (!resource) return {};
        return {
          id: resource.id,
          date: getShortDateFromISODateString(resource.date),
          index,
          patientId: getPatientId(),
          system: LOINC_SYSTEM_URL,
          code: CONTRACT_CODE,
        };
      });
    },
    [getPatientId],
  );

  const getHistory = React.useCallback(
    (callback) => {
      callback = callback || function () {};
      if (!rowData) {
        dispatch({ type: "SET_HISTORY_INITIALIZED", payload: true });
        callback();
        return [];
      }

      dispatch({ type: "SET_HISTORY_INITIALIZED", payload: false });

      sendRequest(
        "/fhir/DocumentReference?patient=" + rowData.id + "&_sort=-date",
        { nocache: true },
      ).then(
        (response) => {
          let data = null;
          try {
            data = JSON.parse(response);
          } catch (e) {
            console.log("Error parsing pain agreement request data ", e);
          }

          if (!data || !data.entry || !data.entry.length) {
            dispatch({ type: "CLEAR_HISTORY" });
            dispatch({ type: "SET_EDIT_MODE", payload: false });
            dispatch({ type: "SET_HISTORY_INITIALIZED", payload: true });
            callback();
            return;
          }

          let agreementData = data.entry
            .filter((item) => {
              const resource = item.resource;
              if (!resource) return false;
              if (!resource.type?.coding?.length) return false;
              return resource.type.coding[0].code === CONTRACT_CODE;
            })
            .sort((a, b) => dateTimeCompare(a.resource.date, b.resource.date));

          if (agreementData.length) {
            const formattedData = createHistoryData(agreementData);
            dispatch({
              type: "HISTORY_LOADED",
              payload: {
                history: formattedData,
                lastEntry: {
                  id: formattedData[0].id,
                  date: formattedData[0].date,
                },
              },
            });
          } else {
            dispatch({ type: "CLEAR_HISTORY" });
          }

          dispatch({ type: "SET_EDIT_MODE", payload: false });
          dispatch({ type: "SET_HISTORY_INITIALIZED", payload: true });
          callback();
        },
        (error) => {
          dispatch({ type: "SET_HISTORY_INITIALIZED", payload: true });
          callback(error);
          console.log("Failed to retrieve data", error);
        },
      );

      return "";
    },
    [rowData, createHistoryData],
  );

  const displayMostRecent = () => {
    if (!history.length) return "";
    return `Last controlled substance agreement signed on <b>${lastEntry.date}</b>`;
  };

  const displayEditHistory = () => {
    if (!history.length) return null;
    return (
      <div style={{ display: "inline-block" }}>
        Last controlled substance agreement signed on{" "}
        <FormattedInput
          defaultValue={lastEntry.date}
          helperText="(YYYY-MM-DD)"
          inputClass={{ input: classes.editInput }}
          handleChange={(e) =>
            dispatch({ type: "SET_EDIT_DATE", payload: e.target.value })
          }
          handleKeyDown={() => handleEditSave()}
          error={hasError()}
        />
      </div>
    );
  };

  const isValidEditDate = () => {
    if (!isValidDateString(editDate)) return false;
    const dateObj = new Date(editDate).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return !(dateObj > today);
  };

  const handleSnackClose = (event, reason) => {
    if (reason === "clickaway") return;
    dispatch({ type: "SET_SNACK_OPEN", payload: false });
  };

  const handlePrintNew = () => {
    const printWindow = window.open(
      "/static/app/files/UW_CST_Agreement.pdf",
      "_blank",
    );
    printWindow.onload = function () {
      printWindow.focus();
      printWindow.print();
      handleUpdate({ date: dayjs().format("YYYY-MM-DD") });
    };
  };

  const columns = [
    { field: "id", hidden: true },
    {
      title: "Agreement Date",
      field: "date",
      emptyValue: "--",
      cellStyle: { padding: "4px 24px 4px 16px" },
      editComponent: (params) => (
        <FormattedInput
          defaultValue={params.value}
          handleChange={(e) => params.onChange(e.target.value)}
        />
      ),
    },
  ];

  const renderTitle = () => (
    <h3>{`Controlled Substance Agreement for ${rowData.first_name} ${rowData.last_name}`}</h3>
  );

  const renderProgressIndicator = () => (
    <div className={classes.progressContainer}>
      <CircularProgress
        className={classes.progressIcon}
        color="primary"
        size={32}
      />
    </div>
  );

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
              className: classes.dateInput,
            },
          }}
          clearable={true}
          format="YYYY-MM-DD"
          minDate={dayjs("1950-01-01")}
          invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
          maxDateMessage="Date must not be in the future"
          value={dateInput ? dayjs(dateInput) : null}
          orientation="landscape"
          onKeyDown={handleKeyDownAdd}
          onChange={(dateString, validationContext) => {
            if (validationContext?.validationError) {
              dispatch({
                type: "SET_DATE_INPUT",
                payload: dateString.format(),
              });
              return;
            }
            dispatch({
              type: "SET_DATE_INPUT",
              payload: dateString ? dateString.format("YYYY-MM-DD") : null,
            });
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
          onClick={() => dispatch({ type: "CLEAR_FIELDS" })}
          disabled={!hasValues()}
        >
          Clear
        </Button>
      </div>
    </Paper>
  );

  const renderMostRecentHistory = () => (
    <React.Fragment>
      <Typography
        variant="caption"
        display="block"
        className={classes.historyTitle}
      >
        Latest Controlled Substance Agreement
      </Typography>
      {!history.length && (
        <div>No previously recorded controlled substance agreement</div>
      )}
      {history.length > 0 && (
        <div>
          <div>
            {!editMode && (
              <span
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(displayMostRecent()),
                }}
              />
            )}
            {editMode && displayEditHistory()}
            <EditButtonGroup
              onEnableEditMode={() => dispatch({ type: "ENABLE_EDIT_MODE" })}
              onDisableEditMode={() => dispatch({ type: "DISABLE_EDIT_MODE" })}
              isUpdateDisabled={!isValidEditDate()}
              handleEditSave={() => handleEditSave()}
              handleDelete={handleDelete}
              entryDescription={`Controlled substance agreement signed on <b>${lastEntry.date}</b>`}
            />
          </div>
          {isAdult(rowData.birth_date) && (
            <OverdueAlert
              date={lastEntry.date}
              type="controlled substance agreement"
              overdueMessage="It has been more than 12 months since the patient has signed a controlled substance agreement."
            />
          )}
        </div>
      )}
    </React.Fragment>
  );

  const renderPrintNewComponent = () => (
    <Paper className={classes.addContainer} elevation={1}>
      <Typography
        variant="caption"
        display="block"
        className={classes.printTitle}
        sx={{ marginBottom: 1.5 }}
      >
        New Agreement
      </Typography>
      <Stack flexDirection="column" gap={1}>
        <div>
          <Button
            variant="outlined"
            onClick={handlePrintNew}
            endIcon={<PrintIcon size="small" sx={{ marginLeft: 1 }} />}
          >
            Print Agreement Form
          </Button>
        </div>
        <Typography variant="caption">
          <strong>Note</strong>: Clicking &ldquo;Print Agreement Form&rdquo; records the
          agreement date.
        </Typography>
      </Stack>
    </Paper>
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
          {!expandHistory ? (
            <Button
              aria-label="expand"
              color="primary"
              onClick={() =>
                dispatch({ type: "SET_EXPAND_HISTORY", payload: true })
              }
              endIcon={<ExpandMoreIcon className={classes.endIcon} />}
              size="small"
              className={classes.expandIcon}
            >
              View
            </Button>
          ) : (
            <Button
              aria-label="collapse"
              color="primary"
              onClick={() =>
                dispatch({ type: "SET_EXPAND_HISTORY", payload: false })
              }
              endIcon={<ExpandLessIcon className={classes.endIcon} />}
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
                actionsCellStyle: { width: "80%", textAlign: "left" },
              }}
            />
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
        />
      </div>
    </Snackbar>
  );

  const renderError = () => (
    <div className={classes.errorContainer}>
      {error && <Error message={error} />}
    </div>
  );

  React.useEffect(() => {
    getHistory();
  }, [getHistory]);

  return (
    <div className={classes.container}>
      <div className={classes.contentContainer}>
        {renderTitle()}
        {addInProgress && renderProgressIndicator()}
        {enableAddNew && renderAddComponent()}
        {enablePrintNew && renderPrintNewComponent()}
        <Paper className={classes.historyContainer} elevation={1}>
          {(!historyInitialized || updateInProgress) &&
            renderProgressIndicator()}
          {historyInitialized && renderMostRecentHistory()}
        </Paper>
        {history.length > 0 && renderHistory()}
        {renderFeedbackSnackbar()}
        {renderError()}
      </div>
    </div>
  );
}

Agreement.propTypes = {
  rowData: PropTypes.object.isRequired,
};
