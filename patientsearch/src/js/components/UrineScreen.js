import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import makeStyles from "@mui/styles/makeStyles";
import isValid from "date-fns/isValid";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Alert from "./Alert";
import EditButtonGroup from "./EditButtonGroup";
import Error from "./Error";
import HistoryTable from "./HistoryTable";
import FormattedInput from "./FormattedInput";
import OverdueAlert from "./OverdueAlert";
import {
  fetchData,
  dateTimeCompare,
  getShortDateFromISODateString,
  isAdult,
  padDateString,
  sendRequest,
} from "../helpers/utility";
import { useSettingContext } from "../context/SettingContextProvider";

const useStyles = makeStyles((theme) => {
  if (!theme) return null;
  const palette = theme.palette;
  return {
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
    typeContainer: {
      position: "relative",
    },
    textDisplay: {
      marginTop: theme.spacing(3),
    },
    buttonsContainer: {
      marginTop: theme.spacing(2.5),
      position: "relative",
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
      boxShadow: "none",
    },
    progressIcon: {
      position: "absolute",
      top: "10%",
      left: "10%",
    },
    historyContainer: {
      position: "relative",
      marginBottom: theme.spacing(2),
      padding: theme.spacing(2),
      minHeight: theme.spacing(9),
    },
    historyTitle: {
      display: "inline-block",
      fontWeight: 500,
      color: palette && palette.dark ? palette.dark.main : "#444",
      borderBottom: `2px solid ${theme.palette.primary.lightest}`,
      marginBottom: theme.spacing(1),
    },
    addTitle: {
      display: "inline-block",
      fontWeight: 500,
      color: palette && palette.dark ? palette.dark.main : "#444",
      borderBottom: `2px solid ${theme.palette.primary.lightest}`,
      marginBottom: theme.spacing(2.5),
    },
    addButton: {
      marginRight: theme.spacing(1),
    },
    dateInput: {
      minWidth: "248px",
    },
    selectFormControl: {
      marginBottom: theme.spacing(1),
    },
    selectBox: {
      minWidth: "248px",
      fontSize: "14px",
      marginRight: theme.spacing(0.5),
    },
    dateLabel: {
      fontSize: "12px",
      marginBottom: theme.spacing(0.25),
    },
    readonlyLabel: {
      fontSize: "12px",
      marginBottom: theme.spacing(0.5),
    },
    menuItem: {
      fontSize: "14px",
    },
    editInput: {
      width: theme.spacing(10),
      border: 0,
      textAlign: "center"
    },
    errorContainer: {
      maxWidth: "100%",
      marginTop: theme.spacing(3),
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
    overDueContainer: {
      marginBottom: theme.spacing(2),
    },
  };
});

export default function UrineScreen(props) {
  const appCtx = useSettingContext();
  const appSettingsRef = React.useRef(appCtx.appSettings);
  const classes = useStyles();
  const urineScreenTypes = (() => {
    const appSettings = appSettingsRef.current;
    return appSettings && appSettings["UDS_LAB_TYPES"]
      ? appSettings["UDS_LAB_TYPES"]
      : null;
  })();
  const lastEntryReducer = (state, action) => {
    if (action.type == "reset") {
      return {
        id: null,
        date: "",
        type: "",
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
    type: "",
  });
  const [type, setType] = React.useState(
    urineScreenTypes && urineScreenTypes.length === 1
      ? urineScreenTypes[0].code
      : ""
  );
  const [dateInput, setDateInput] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [addInProgress, setAddInProgress] = React.useState(false);
  const [updateInProgress, setUpdateInProgress] = React.useState(false);
  const [error, setError] = React.useState("");
  const [snackOpen, setSnackOpen] = React.useState(false);
  const [historyInitialized, setHistoryInitialized] = React.useState(false);
  const [expandHistory, setExpandHistory] = React.useState(false);
  const defaultValues = {
    mode: false,
    type: "",
    date: "",
  };
  const editReducer = (state, action) => {
    if (action.key) {
      return {
        ...state,
        [action.key]: action.value,
      };
    }
    if (action.type === "update") {
      return {
        ...state,
        ...action.data,
      };
    }
    if (action.type === "reset") {
      return defaultValues;
    }
    return state;
  };
  const [editEntry, editDispatch] = React.useReducer(
    editReducer,
    defaultValues
  );
  const URINE_SCREEN_TYPE_LABEL = "Urine Drug Screen Name";
  const { rowData } = props;
  const getPatientId = React.useCallback(() => {
    if (rowData) return rowData.id;
    return null;
  }, [rowData]);
  const clearDate = () => {
    setDateInput("");
  };
  const clearHistory = () => {
    setHistory([]);
    lastEntryDispatch({
      type: "reset",
    });
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
    editDispatch({
      key: "type",
      value: event.target.value,
    });
  };
  const hasValues = () => {
    return type && dateInput;
  };
  const hasError = () => {
    return error !== "";
  };
  const createHistoryData = React.useCallback(
    (data) => {
      if (!data) return [];
      return data.map((item, index) => {
        const resource = item.resource;
        if (!resource) return {};
        let text = resource.code ? resource.code.text : "";
        let date = getShortDateFromISODateString(resource.authoredOn);
        let type =
          resource.code && resource.code.coding && resource.code.coding.length
            ? resource.code.coding[0].code
            : "";
        return {
          id: resource.id,
          index: index,
          type: type,
          text: text,
          date: date,
          patientId: getPatientId(),
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
      const types = urineScreenTypes;

      setHistoryInitialized(false);
      /*
       * retrieve urine screen history
       */
      sendRequest("/fhir/ServiceRequest?patient=" + rowData.id, {
        nocache: true,
      }).then(
        (response) => {
          let data = null;
          try {
            data = JSON.parse(response);
          } catch (e) {
            console.log("Eerror parsing urine screen service request data ", e);
          }
          if (!data || !data.entry || !data.entry.length) {
            clearHistory();
            editDispatch({
              key: "mode",
              value: false,
            });
            setHistoryInitialized(true);
            callback();
            return;
          }
          const availableCodes = types.map((item) => item.code);
          let urineScreenData = data.entry.filter((item) => {
            let resource = item.resource;
            if (!resource) return false;
            if (
              !resource.code ||
              !resource.code.coding ||
              !resource.code.coding.length
            )
              return false;
            return availableCodes.indexOf(resource.code.coding[0].code) !== -1;
          });
          if (urineScreenData.length) {
            urineScreenData = urineScreenData.sort(function (a, b) {
              return dateTimeCompare(
                a.resource.authoredOn,
                b.resource.authoredOn
              );
            });
            const formattedData = createHistoryData(urineScreenData);
            setHistory(formattedData);
            lastEntryDispatch({
              type: "update",
              data: {
                id: formattedData[0].id,
                date: formattedData[0].date,
                type: formattedData[0].type,
              },
            });
          } else {
            clearHistory();
          }
          editDispatch({
            key: "mode",
            value: false,
          });
          setHistoryInitialized(true);
          callback();
        },
        (error) => {
          console.log("Failed to retrieve data", error);
          callback(error);
          setHistoryInitialized(true);
        }
      );
      return "";
    },
    [rowData, urineScreenTypes, createHistoryData]
  );
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
    let typeMatch = urineScreenTypes.filter((item) => {
      return item.code === testType;
    });
    var resource = {
      authoredOn: padDateString(testDate),
      code: {
        coding: [
          {
            code: testType,
            display: typeMatch[0].display,
            system: typeMatch[0].system,
          },
        ],
        text: typeMatch[0].text,
      },
      resourceType: "ServiceRequest",
      subject: {
        reference:
          "Patient/" + (params.patientId ? params.patientId : getPatientId()),
      },
    };
    //include id if present, necessary for PUT request
    if (params.id) {
      resource = { ...resource, ...{ id: params.id } };
    }
    return resource;
  };
  const handleUpdate = (params, callback) => {
    params = params || {};
    callback = callback || function () {};
    const testType = params.type ? params.type : type;
    const testDate = params.date ? params.date : dateInput;
    let typeMatch = urineScreenTypes.filter((item) => {
      return item.code === testType;
    });
    if (String(params.method).toLowerCase() !== "delete") {
      if (!testType || !typeMatch.length) {
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
    fetchData(
      "/fhir/ServiceRequest" + (params.id ? "/" + params.id : ""),
      {
        method: params.method ? params.method : "POST",
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
        if (!snackOpen || !setHistoryInitialized)
          setSnackOpen(true);
        setTimeout(() => {
          getHistory(callback);
        }, 150);
      })
      .catch((e) => {
        callback(e);
        console.log("error submtting request ", e);
        handleSubmissionError();
      });
  };
  const handleEditSave = (params) => {
    params = params || {};
    if (!Object.keys(params).length)
      params = {
        id: lastEntry.id,
        date: editEntry.date,
        type: editEntry.type,
      };
    setUpdateInProgress(true);
    handleUpdate(
      {
        ...params,
        ...{
          method: "PUT",
        },
      },
      () => setTimeout(setUpdateInProgress(false), 350)
    );
  };
  const handleDelete = (params) => {
    params = params || {};
    if (!Object.keys(params).length)
      params = {
        id: lastEntry.id,
        date: editEntry.date ? editEntry.date : lastEntry.date,
        type: editEntry.type ? editEntry.type : lastEntry.type,
      };
    setUpdateInProgress(true);
    handleUpdate(
      {
        ...params,
        ...{
          method: "DELETE",
        },
      },
      () => setTimeout(setUpdateInProgress(false), 350)
    );
  };
  const handleSubmissionError = () => {
    setError("Data submission failed. Unable to process your request.");
    setSnackOpen(false);
  };
  const handleEnableEditMode = () => {
    editDispatch({
      type: "update",
      data: {
        type: lastEntry.type,
        date: lastEntry.date,
        mode: true,
      },
    });
    setError("");
  };
  const handleDisableEditMode = () => {
    editDispatch({ type: "reset" });
    setError("");
  };
  const isValidEditType = () => {
    if (onlyOneUrineScreenType()) return true;
    return editEntry.type;
  };
  const isValidEditDate = () => {
    let dateObj = new Date(editEntry.date).setHours(0, 0, 0, 0);
    let today = new Date().setHours(0, 0, 0, 0);
    return isValid(dateObj) && !(dateObj > today);
  };
  const hasValidEditEntry = () => {
    return isValidEditType() && isValidEditDate();
  };
  const handleEditDateChange = (event) => {
    editDispatch({
      key: "date",
      value: event.target.value,
    });
  };
  const hasHistory = () => {
    return history && history.length > 0;
  };
  const displayMostRecentEntry = () => {
    if (!hasHistory()) return "";
    if (history[0].text)
      return history[0].text + " ordered on <b>" + lastEntry.date + "</b>";
    return "Ordered on <b>" + lastEntry.date + "</b>";
  };
  const displayEditHistoryByRow = (index) => {
    if (!hasHistory()) return null;
    if (!index) index = 0;
    const selectType = history[index].type;
    const selectDate = history[index].date;
    const orderText = history[index].text || "";
    return (
      <React.Fragment>
        {onlyOneUrineScreenType() ? (
          orderText
        ) : (
          <FormControl>
            <Select
              defaultValue={selectType}
              onChange={handleEditTypeChange}
              className={classes.selectBox}
              IconComponent={() => (
                <ArrowDropDownIcon color="primary"></ArrowDropDownIcon>
              )}
              error={hasError()}
              variant="standard"
            >
              {getUrineScreenTypeSelectList()}
            </Select>
            <FormHelperText>{`(${URINE_SCREEN_TYPE_LABEL})`}</FormHelperText>
          </FormControl>
        )}
        <span> ordered on </span>
        <div style={{ display: "inline-block" }}>
          {" "}
          <FormattedInput
            defaultValue={selectDate}
            helperText="(YYYY-MM-DD)"
            disableFocus={!onlyOneUrineScreenType()}
            handleChange={(e) => handleEditDateChange(e)}
            handleKeyDown={(e) => handleEditSave(e)}
            inputClass={{ input: classes.editInput }}
            error={hasError()}
          ></FormattedInput>
        </div>
      </React.Fragment>
    );
  };
  const getOneUrineScreenDisplayText = () => {
    let matchedType = urineScreenTypes[0];
    if (matchedType) return matchedType.text;
    else return "";
  };
  const onlyOneUrineScreenType = React.useCallback(() => {
    return urineScreenTypes && urineScreenTypes.length === 1;
  }, [urineScreenTypes]);

  const hasUrineScreenTypes = () => {
    return !onlyOneUrineScreenType() && !noUrineScreenTypes();
  };
  const noUrineScreenTypes = () => {
    return !urineScreenTypes || !urineScreenTypes.length;
  };
  const getUrineScreenTypeSelectList = () => {
    return urineScreenTypes.map((item) => {
      return (
        <MenuItem value={item.code} key={item.code}>
          <Typography variant="body2">{item.text}</Typography>
        </MenuItem>
      );
    });
  };
  const getColumns = () => [
    {
      field: "id",
      hidden: true,
    },
    {
      title: "Urine Drug Screen Name",
      field: "type",
      emptyValue: "--",
      cellStyle: {
        padding: "4px 24px 4px 16px",
      },
      lookup: getSelectLookupTypes(),
      editable: !onlyOneUrineScreenType() ? "always" : "never",
    },
    {
      title: "Order Date",
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
  const getSelectLookupTypes = () => {
    if (!urineScreenTypes) return;
    let types = {};
    urineScreenTypes.forEach((item) => {
      types[item.code] = item.text;
    });
    return types;
  };
  const handleSnackClose = (event, reason) => {
    if (event) event.stopPropagation();
    if (reason === "clickaway") {
      return;
    }
    setSnackOpen(false);
  };
  const renderTitle = () => (
    <h3>{`Urine Drug Toxicology Screen for ${rowData.first_name} ${rowData.last_name}`}</h3>
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
      {/* urine screen date/datepicker */}
      <div>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {/* order date field */}
          <InputLabel className={classes.dateLabel}>Order Date</InputLabel>
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
            format="YYYY-MM-DD"
            minDate={dayjs("1950-01-01")}
            maxDateMessage="Date must not be in the future"
            invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
            value={dateInput ? dayjs(dateInput) : null}
            orientation="landscape"
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
      </div>
      {/* urine screen type selector */}
      {renderUrineTypeSelector()}
      {!noUrineScreenTypes() && (
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
      )}
    </Paper>
  );
  const renderUrineTypeSelector = () => (
    <div className={classes.typeContainer}>
      <div>
        {onlyOneUrineScreenType() && (
          <div className={classes.textDisplay}>
            <InputLabel className={classes.readonlyLabel}>
              {URINE_SCREEN_TYPE_LABEL}
            </InputLabel>
            <Typography variant="subtitle2">
              {getOneUrineScreenDisplayText()}
            </Typography>
          </div>
        )}
        {hasUrineScreenTypes() && (
          <FormControl className={classes.selectFormControl} variant="standard">
            <InputLabel className={classes.label}>
              {URINE_SCREEN_TYPE_LABEL}
            </InputLabel>
            <Select
              value={type}
              onChange={handleTypeChange}
              className={classes.selectBox}
              IconComponent={() => (
                <ArrowDropDownIcon color="primary"></ArrowDropDownIcon>
              )}
            >
              {getUrineScreenTypeSelectList()}
            </Select>
          </FormControl>
        )}
        {noUrineScreenTypes() && (
          <div className={classes.errorContainer}>
            <Error
              message={"No urine drug screen type list is loaded."}
            ></Error>
          </div>
        )}
      </div>
    </div>
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
      >
        Last Urine Drug Screen
      </Typography>
      {!hasHistory() && <div>No previously recorded urine drug screen</div>}
      {/* most recent entry */}
      {hasHistory() && (
        <React.Fragment>
          <div>
            {!editEntry.mode && (
              <span
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(displayMostRecentEntry()),
                }}
              ></span>
            )}
            {editEntry.mode && displayEditHistoryByRow(0)}
            <EditButtonGroup
              onEnableEditMode={handleEnableEditMode}
              onDisableEditMode={handleDisableEditMode}
              isUpdateDisabled={!hasValidEditEntry()}
              handleEditSave={() => handleEditSave()}
              handleDelete={() => handleDelete()}
              entryDescription={displayMostRecentEntry()}
            ></EditButtonGroup>
          </div>
          {/* alerts */}
          {isAdult(rowData.birth_date) && (
            <div className={classes.overDueContainer}>
              <OverdueAlert
                date={lastEntry.date}
                type="urine drug screen"
              ></OverdueAlert>
            </div>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
  const renderHistory = () => (
    <Paper className={classes.historyContainer} elevation={1}>
      <Typography
        variant="caption"
        display="block"
        className={classes.historyTitle}
      >
        History
      </Typography>
      <div className={classes.totalEntriesContainer}>
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
      <div className={classes.tableContainer}>
        {expandHistory && (
          <div className="history-table">
            <HistoryTable
              data={history}
              columns={getColumns()}
              APIURL="/fhir/ServiceRequest/"
              submitDataFormatter={submitDataFormatter}
              onRowUpdate={() => getHistory()}
              onRowDelete={() => getHistory()}
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
      {renderTitle()}
      <div className={classes.contentContainer}>
        {renderAddInProgressIndicator()}
        {/* UI to add new */}
        {renderAddComponent()}
        {/* history */}
        <Paper className={classes.historyContainer} elevation={1}>
          {(!historyInitialized || updateInProgress) &&
            renderUpdateInProgressIndicator()}
          {historyInitialized && renderMostRecentHistory()}
          {hasHistory() && renderHistory()}
        </Paper>
        {/* feedback snack popup */}
        {renderFeedbackSnackbar()}
        {/* error message UI */}
        {renderError()}
      </div>
    </div>
  );
}
UrineScreen.propTypes = {
  rowData: PropTypes.object.isRequired,
};
