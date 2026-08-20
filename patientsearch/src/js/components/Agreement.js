import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import DOMPurify from "dompurify";
import Button from "@mui/material/Button";
import FormHelperText from "@mui/material/FormHelperText";
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
import { useSettingContext } from "../context/AppContextProvider";

const LOINC_SYSTEM_URL = "https://loinc.org";
const CONTRACT_CODE = "94136-9";
const titleStyle = (theme) => ({
  color: theme.palette.dark ? theme.palette.dark.main : "#444",
  fontWeight: 500,
  borderBottom: `2px solid ${theme.palette.primary.lightest}`,
  width: "fit-content",
});

const initialState = {
  editDate: null,
  editMode: false,
  lastEntry: { id: null, date: "" },
  dateInput: null,
  dateError: "",
  addInProgress: false,
  updateInProgress: false,
  historyInitialized: false,
  history: [],
  expandHistory: false,
  error: "",
  snackOpen: false,
  isPrinting: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_EDIT_DATE":
      return { ...state, editDate: action.payload };
    case "SET_EDIT_MODE":
      return { ...state, editMode: action.payload };
    case "SET_DATE_INPUT":
      return { ...state, dateInput: action.payload };
    case "SET_DATE_ERROR":
      return { ...state, dateError: action.payload };
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
      return { ...state, dateInput: null, dateError: "", error: "" };
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
    case "LOADING_START":
      return { ...state, updateInProgress: true, error: "" };
    case "LOADING_END":
      return {
        ...state,
        addInProgress: false,
        updateInProgress: false,
      };
    case "SET_IS_PRINTING":
      return { ...state, isPrinting: action.payload };
    default:
      return state;
  }
}

export default function Agreement(props) {
  const theme = useTheme();
  const classes = {
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
      marginBottom: 1.5,
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
      marginBottom: "8px",
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
  };
  const appCtx = useSettingContext();
  const appSettingsRef = React.useRef(appCtx.appSettings);
  const appSettings = appSettingsRef.current;
  const enableAddNew = !!(appSettings && appSettings["ENABLE_ADD_NEW_CS"]);
  const enablePrintNew = !enableAddNew;
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const {
    editDate,
    editMode,
    lastEntry,
    dateInput,
    dateError,
    addInProgress,
    updateInProgress,
    historyInitialized,
    history,
    expandHistory,
    error,
    snackOpen,
    isPrinting
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

  const handleUpdate = async (params = {}, callback = () => {}) => {
    const contractDate =
      params.date ||
      (dayjs.isDayjs(dateInput) ? dateInput.format("YYYY-MM-DD") : dateInput);

    if (!contractDate) {
      dispatch({ type: "SET_ERROR", payload: "No contract date provided." });
      return callback({ error: true });
    }

    // Prevent duplicate submissions
    if (
      history?.some((entry) => entry.date === contractDate) &&
      params.method !== "DELETE"
    ) {
      return callback();
    }

    dispatch({ type: "SET_ERROR", payload: "" });
    const resource = submitDataFormatter(params);
    const resourceId = params.id ? `/${params.id}` : "";

    try {
      await fetchData(`/fhir/DocumentReference${resourceId}`, {
        method: params.method || "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          cache: "no-cache",
        },
        body: JSON.stringify(resource),
      });

      dispatch({ type: "SET_SNACK_OPEN", payload: true });

      // Refresh history immediately after successful update
      await getHistory();
      callback();
    } catch (e) {
      console.error("Submission error:", e);
      dispatch({ type: "SUBMISSION_ERROR" });
      callback(e);
    }
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
    async (callback = () => {}) => {
      if (!rowData?.id) {
        dispatch({ type: "SET_HISTORY_INITIALIZED", payload: true });
        return;
      }

      dispatch({ type: "SET_HISTORY_INITIALIZED", payload: false });

      try {
        const response = await sendRequest(
          `/fhir/DocumentReference?patient=${rowData.id}&_sort=-date`,
          { nocache: true },
        );

        const data = JSON.parse(response);

        if (!data?.entry?.length) {
          dispatch({ type: "CLEAR_HISTORY" });
        } else {
          const agreementData = data.entry
            .filter((item) => {
              const resource = item.resource;
              return resource?.type?.coding?.[0]?.code === CONTRACT_CODE;
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
        }
        callback();
      } catch (e) {
        console.error("Failed to retrieve or parse data", e);
        dispatch({ type: "SET_ERROR", payload: "Could not load history." });
        callback(e);
      } finally {
        dispatch({ type: "SET_EDIT_MODE", payload: false });
        dispatch({ type: "SET_HISTORY_INITIALIZED", payload: true });
      }
    },
    [rowData?.id, createHistoryData],
  ); // Depend on ID specifically, not the whole object

  const displayMostRecent = () => {
    if (!history.length) return "";
    return `Signed on <b>${lastEntry.date}</b>`;
  };

  const displayEditHistory = () => {
    if (!history.length) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>Signed on</span>
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
   if (isPrinting) return; // Prevent double-taps

   dispatch({ type: "SET_IS_PRINTING", payload: true });
   const pdfUrl = "/static/app/files/UW_CST_Agreement.pdf";

   const printWindow = window.open(pdfUrl, "_blank");

   handleUpdate({ date: dayjs().format("YYYY-MM-DD") }, () => {
     dispatch({ type: "SET_IS_PRINTING", payload: false });
   });

   if (!printWindow) {
     alert("Please allow popups to view the agreement.");
     dispatch({ type: "SET_IS_PRINTING", payload: false });
   }
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
    <div style={classes.progressContainer}>
      <CircularProgress sx={classes.progressIcon} color="primary" size={32} />
    </div>
  );

  const renderAddComponent = () => (
    <Paper sx={classes.addContainer} elevation={1}>
      <Typography
        variant="caption"
        sx={[
          {
            display: "block",
          },
          classes.addTitle,
        ]}
      >
        Add New
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <InputLabel sx={classes.dateLabel}>Agreement Date</InputLabel>
        <DatePicker
          openTo="day"
          disableFuture
          orientation="landscape"
          format="YYYY-MM-DD"
          minDate={dayjs("1950-01-01")}
          value={dateInput ? dayjs(dateInput) : null}
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
          onError={(reason) => {
            const messages = {
              invalidDate: "Date must be in YYYY-MM-DD format, e.g. 1977-01-12",
              disableFuture: "Date must not be in the future",
              minDate: "Date must not be earlier than 1950-01-01",
            };
            dispatch({
              type: "SET_DATE_ERROR",
              payload: reason ? messages[reason] || "Invalid date" : "",
            });
          }}
          slotProps={{
            textField: {
              placeholder: "YYYY-MM-DD",
              variant: "standard",
              sx: classes.dateInput,
              autoFocus: true,
              onKeyDown: handleKeyDownAdd,
              error: !!dateError,
              slotProps: {
                inputLabel: { shrink: true },
              },
            },
          }}
        />
        {dateError && <FormHelperText error>{dateError}</FormHelperText>}
      </LocalizationProvider>
      <div style={classes.buttonsContainer}>
        <Button
          variant="contained"
          color="primary"
          sx={classes.addButton}
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
        sx={[
          {
            display: "block",
          },
          classes.historyTitle,
        ]}
      >
        Latest Controlled Substance Agreement
      </Typography>
      {!history.length && (
        <div>No previously recorded controlled substance agreement</div>
      )}
      {history.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
    <Paper sx={classes.addContainer} elevation={1}>
      <Typography
        variant="caption"
        sx={[
          {
            display: "block",
          },
          classes.printTitle,
        ]}
      >
        New Agreement
      </Typography>
      <Stack
        sx={{
          flexDirection: "column",
          gap: 1,
        }}
      >
        <div>
          <Button
            variant="outlined"
            onClick={handlePrintNew}
            disabled={isPrinting}
            endIcon={
              isPrinting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PrintIcon size="small" />
              )
            }
          >
            {isPrinting ? "Processing..." : "Print Agreement Form"}
          </Button>
        </div>
        <Typography variant="caption">
          <strong>Note</strong>: Clicking &ldquo;Print Agreement Form&rdquo;
          records the agreement date.
        </Typography>
      </Stack>
    </Paper>
  );

  const renderHistory = () => (
    <Paper sx={classes.historyContainer} elevation={1}>
      <div style={classes.totalEntriesContainer}>
        <Typography
          variant="caption"
          sx={[
            {
              display: "block",
            },
            classes.historyTitle,
          ]}
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
              endIcon={<ExpandMoreIcon sx={classes.endIcon} />}
              size="small"
              sx={classes.expandIcon}
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
              endIcon={<ExpandLessIcon sx={classes.endIcon} />}
              size="small"
              sx={classes.expandIcon}
            >
              Hide
            </Button>
          )}
        </div>
      </div>
      <div style={classes.tableContainer}>
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
    <div style={classes.errorContainer}>
      {error && <Error message={error} />}
    </div>
  );

  React.useEffect(() => {
    getHistory();
  }, [getHistory]);

  return (
    <div style={classes.container}>
      <div style={classes.contentContainer}>
        {renderTitle()}
        {addInProgress && renderProgressIndicator()}
        {enableAddNew && renderAddComponent()}
        {enablePrintNew && renderPrintNewComponent()}
        <Paper sx={classes.historyContainer} elevation={1}>
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
