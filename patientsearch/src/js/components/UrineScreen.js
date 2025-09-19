import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import makeStyles from "@mui/styles/makeStyles";
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
  isValidDateString,
  isEmptyArray,
  padDateString,
  sendRequest,
} from "../helpers/utility";
import {
  EHR_SYSTEM_URLS,
  UWMC_LAB_ORDER_SYSTEM_URL,
} from "../constants/consts.js";
import { useSettingContext } from "../context/SettingContextProvider";
import { useUserContext } from "../context/UserContextProvider";

const useStyles = makeStyles((theme) => {
  if (!theme) return null;
  const palette = theme.palette;
  return {
    container: {
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1),
    },
    contentContainer: {
      position: "relative",
    },
    itemContainer: {
      position: "relative",
      marginBottom: theme.spacing(1),
      padding: theme.spacing(1, 2, 1),
    },
    typeContainer: {
      position: "relative",
    },
    textDisplay: {
      marginTop: theme.spacing(3),
    },
    buttonsContainer: {
      marginTop: theme.spacing(1.5),
      marginBottm: theme.spacing(1),
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
    recentEntryContainer: {
      position: "relative",
      marginBottom: theme.spacing(1),
      padding: theme.spacing(1, 2, 0.5),
    },
    historyTitle: {
      display: "inline-block",
      fontWeight: 500,
      color: palette && palette.dark ? palette.dark.main : "#444",
      marginBottom: theme.spacing(1),
      borderBottom: `2px solid ${theme.palette.primary.lightest}`,
    },
    addTitle: {
      display: "inline-block",
      fontWeight: 500,
      color: palette && palette.dark ? palette.dark.main : "#444",
      marginBottom: theme.spacing(1),
      borderBottom: `2px solid ${theme.palette.primary.lightest}`,
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
      textAlign: "center",
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
  const { user } = useUserContext();
  const appCtx = useSettingContext();
  const appSettingsRef = React.useRef(appCtx.appSettings);
  const classes = useStyles();
  const configUrineScreenTypes = (() => {
    const appSettings = appSettingsRef.current;
    return appSettings && appSettings["UDS_LAB_TYPES"]
      ? appSettings["UDS_LAB_TYPES"]
      : null;
  })();
  const editableUrineScreenTypes = configUrineScreenTypes
    ? configUrineScreenTypes.filter((item) =>
        item.identifier
          ? !item.identifier.find(
              (o) => EHR_SYSTEM_URLS.indexOf(o.system) !== -1
            )
          : true
      )
    : null;
  const entryDefaultValue = {
    id: null,
    date: "",
    type: "",
    readonly: false,
  };
  const defaultEditValues = {
    ...entryDefaultValue,
    mode: false,
  };
  const initialHistoryState = {
    data: [],
    mostRecentEntry: entryDefaultValue,
    orderInfoMessage: "",
    initialized: false,
    addInProgress: false,
    updateInProgress: false,
    snackOpen: false,
    expand: false,
  };
  const initialUIState = {
    history: initialHistoryState,
    edit: defaultEditValues,
  };

  const uiReducer = (state, action) => {
    switch (action.type) {
      /** -------------------- HISTORY ACTIONS -------------------- **/
      case "history/init":
        return {
          ...state,
          history: {
            ...state.history,
            snackOpen: false,
            initialized: false,
          },
        };

      case "history/init-complete":
        // expect action.payload: { data, mostRecentEntry, orderInfoMessage? }
        return {
          ...state,
          history: {
            ...state.history,
            ...action.payload,
            initialized: true,
          },
          edit: defaultEditValues,
        };

      case "history/add":
        return {
          ...state,
          history: {
            ...state.history,
            addInProgress: true,
            snackOpen: false,
            initialized: false,
          },
        };

      case "history/add-complete":
        // expect action.payload: { data, mostRecentEntry, orderInfoMessage? }
        return {
          ...state,
          history: {
            ...state.history,
            ...action.payload,
            addInProgress: false,
            initialized: true,
            snackOpen: true,
            expand: false,
          },
          edit: {
            ...state.edit,
            mode: false
          },
        };

      case "history/update":
        return {
          ...state,
          history: {
            ...state.history,
            updateInProgress: true,
            snackOpen: false,
            initialized: false,
          },
        };

      case "history/update-complete":
        // expect action.payload: { data, mostRecentEntry, orderInfoMessage? }
        return {
          ...state,
          history: {
            ...state.history,
            ...action.payload,
            updateInProgress: false,
            initialized: true,
            snackOpen: true,
            expand: false,
          },
          edit: {
            ...state.edit,
            mode: false
          },
        };

      case "history/expand-toggle":
        return {
          ...state,
          history: {
            ...state.history,
            expand: !state.history.expand,
          },
        };

      case "history/error":
        return {
          ...state,
          history: {
            ...state.history,
            snackOpen: false,
            initialized: true,
            addInProgress: false,
            updateInProgress: false,
          },
        };

      case "history/snack-close":
        return {
          ...state,
          history: {
            ...state.history,
            snackOpen: false,
          },
        };

      /** -------------------- EDIT ACTIONS -------------------- **/
      case "edit/set": {
        // expect action.key, action.value
        if (!action.key) return state;
        return {
          ...state,
          edit: {
            ...state.edit,
            [action.key]: action.value,
          },
        };
      }

      case "edit/update":
        // expect action.data (partial)
        return {
          ...state,
          edit: {
            ...state.edit,
            ...action.data,
          },
        };

      case "edit/reset":
        return {
          ...state,
          edit: defaultEditValues,
        };

      /** -------------------- FALLBACK -------------------- **/
      default:
        return state;
    }
  };
  const [uiState, dispatch] = React.useReducer(uiReducer, initialUIState);

  // convenience locals (so you don’t have to refactor many reads)
  const historyState = uiState.history;
  const editEntry = uiState.edit;
  const [type, setType] = React.useState(
    !isEmptyArray(editableUrineScreenTypes) &&
      editableUrineScreenTypes.length === 1
      ? editableUrineScreenTypes[0].code
      : ""
  );
  const [dateInput, setDateInput] = React.useState(null);
  const [error, setError] = React.useState("");
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
    dispatch({
      type: "history/init-complete",
      payload: {
        data: [],
        mostRecentEntry: entryDefaultValue,
      },
    });
  };
  const clearFields = () => {
    clearDate();
    if (!onlyOneEditableUrineScreenType()) setType("");
    setError("");
  };
  const handleTypeChange = (event) => {
    setType(event.target.value);
  };
  const handleEditTypeChange = (event) => {
    dispatch({ type: "edit/set", key: "type", value: event.target.value });
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
        let text =
          resource.code && resource.code.text
            ? resource.code.text
            : resource.code && !isEmptyArray(resource.code.coding)
            ? resource.code.coding[0].display
            : "";
        let date = getShortDateFromISODateString(resource.authoredOn);
        let type =
          resource.code && !isEmptyArray(resource.code.coding)
            ? resource.code.coding[0].code
            : "";
        let readonly = !isEmptyArray(resource.identifier)
          ? !!resource.identifier.find(
              (item) => EHR_SYSTEM_URLS.indexOf(item.system) !== -1
            )
          : false;
        let requester =
          resource.requester && resource.requester.display
            ? resource.requester.display
            : null;
        const identifiers = resource.identifier;
        const isDawg = identifiers?.find(
          (o) => o.system && o.system === UWMC_LAB_ORDER_SYSTEM_URL
        );
        const readonlyOrderLabel = isDawg ? "UW lab order" : "EHR";
        return {
          id: resource.id,
          index: index,
          type: type ? type : text,
          text: text,
          date: date,
          patientId: getPatientId(),
          readonly: readonly,
          requester: requester,
          source: readonly
            ? `${readonlyOrderLabel} ${
                requester ? " (placed by " + requester + ")" : ""
              }`
            : requester
            ? `manually entered (placed by ${requester})`
            : "manually entered",
        };
      });
    },
    [getPatientId]
  );
  const getHistory = React.useCallback(
    (callback, mode) => {
      callback = callback || function () {};
      if (!rowData) {
        dispatch({ type: "history/error" });
        callback();
        return [];
      }
      if (!mode) {
        dispatch({ type: "history/init" });
      }
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
          if (!data || isEmptyArray(data.entry)) {
            clearHistory();
            callback();
            return;
          }
          const availableCodes = configUrineScreenTypes.map(
            (item) => item.code
          );
          const systemIdentifiers = configUrineScreenTypes
            .filter((item) => !isEmptyArray(item.identifier))
            .map((item) => item.identifier.map((item) => item.system))
            .flat();
          let urineScreenData = data.entry.filter((item) => {
            let resource = item.resource;
            if (!resource) return false;
            if (!resource.code || isEmptyArray(resource.code.coding))
              return false;
            if (!isEmptyArray(resource.identifier)) {
              return resource.identifier.find(
                (item) => systemIdentifiers.indexOf(item.system) !== -1
              );
            }
            return availableCodes.indexOf(resource.code.coding[0].code) !== -1;
          });
          if (!isEmptyArray(urineScreenData)) {
            urineScreenData = urineScreenData.sort(function (a, b) {
              return dateTimeCompare(
                a.resource.authoredOn,
                b.resource.authoredOn
              );
            });
            const formattedData = createHistoryData(urineScreenData);
            const isEHR = urineScreenData.find(
              (o) => !isEmptyArray(o.resource.identifier)
            );
            const isDawg =
              isEHR &&
              urineScreenData.find(
                (o) =>
                  o.resource.identifier &&
                  o.resource.identifier.find(
                    (item) => item.system === UWMC_LAB_ORDER_SYSTEM_URL
                  )
              );
            dispatch({
              type: mode ? `history/${mode}-complete` : "history/init-complete",
              payload: {
                data: formattedData,
                mostRecentEntry: formattedData[0],
                orderInfoMessage: isEHR
                  ? `Display of ${
                      isDawg ? "UW" : "EHR"
                    } lab orders may be delayed by 24-48 hours`
                  : "",
              },
            });
          } else {
            clearHistory();
          }
          callback();
        },
        (error) => {
          console.log("Failed to retrieve data", error);
          callback(error);
          dispatch({ type: "history/error" });
        }
      );
      return "";
    },
    [rowData, configUrineScreenTypes, createHistoryData]
  );
  const handleAdd = (params) => {
    handleUpdate(
      {
        ...params,
        mode: "add",
      },
      () => {
        clearFields();
        setTimeout(() => {
          getHistory(null, "add");
        }, 250);
      }
    );
  };
  const submitDataFormatter = (params) => {
    params = params || {};
    const testType = params.type ? params.type : type;
    const testDate = params.date ? params.date : dateInput;
    let typeMatch = editableUrineScreenTypes.filter((item) => {
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
      requester: user
        ? {
            display: user.name ?? user.username,
          }
        : null,
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
    let typeMatch = editableUrineScreenTypes.filter((item) => {
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

    const mode = params.mode ? params.mode : "update";
    dispatch({
      type: `history/${mode}`,
    });
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
        setTimeout(() => {
          getHistory(callback, mode);
        }, 250);
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
        ...historyState.mostRecentEntry,
        id: historyState.mostRecentEntry.id,
        date: editEntry.date,
        type: editEntry.type,
      };
    handleUpdate({
      ...params,
      ...{
        method: "PUT",
      },
    });
  };
  const handleDelete = (params) => {
    params = params || {};
    const mostRecentEntry = historyState.mostRecentEntry;
    if (!Object.keys(params).length)
      params = {
        ...mostRecentEntry,
        date: editEntry.date ? editEntry.date : mostRecentEntry.date,
        type: editEntry.type ? editEntry.type : mostRecentEntry.type,
      };
    handleUpdate({
      ...params,
      ...{
        method: "DELETE",
      },
    });
  };
  const handleSubmissionError = () => {
    dispatch({ type: "history/error" });
    setError("Data submission failed. Unable to process your request.");
  };
  const handleEnableEditMode = () => {
    const mostRecentEntry = historyState.mostRecentEntry;
    dispatch({
      type: "edit/update",
      data: {
        ...mostRecentEntry,
        type: mostRecentEntry.type,
        date: mostRecentEntry.date,
        mode: true,
      },
    });
    setError("");
  };
  const handleDisableEditMode = () => {
    dispatch({ type: "edit/reset" });
    setError("");
  };
  const isValidEditType = () => {
    if (onlyOneEditableUrineScreenType()) return true;
    return editEntry.type;
  };
  const isValidEditDate = () => {
    if (!isValidDateString(editEntry.date)) return false;
    let dateObj = new Date(editEntry.date).setHours(0, 0, 0, 0);
    let today = new Date().setHours(0, 0, 0, 0);
    return !(dateObj > today);
  };
  const hasValidEditEntry = () => {
    return isValidEditType() && isValidEditDate();
  };
  const handleEditDateChange = (event) => {
    dispatch({ type: "edit/set", key: "date", value: event.target.value });
  };
  const hasHistory = () => {
    return !isEmptyArray(historyState.data);
  };
  const displayMostRecentEntry = () => {
    if (!hasHistory()) return "";
    const history = historyState.data;
    const mostRecentEntry = historyState.mostRecentEntry;
    if (history[0].text) {
      const source = history[0].source ? ", " + history[0].source : "";
      return `${history[0].text} on <b>${mostRecentEntry.date}</b> ${source}`;
    }
    return `Placed on <b>${mostRecentEntry.date}</b>`;
  };
  const displayEditHistoryByRow = (index) => {
    if (!hasHistory()) return null;
    if (!index) index = 0;
    const history = historyState.data;
    const selectType = history[index].type;
    const selectDate = history[index].date;
    const orderText = history[index].text || "";
    const mostRecentEntry = historyState.mostRecentEntry;
    return (
      <React.Fragment>
        {onlyOneEditableUrineScreenType() || mostRecentEntry?.readonly ? (
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
        <span> placed on </span>
        <div style={{ display: "inline-block" }}>
          <FormattedInput
            defaultValue={selectDate}
            helperText="(YYYY-MM-DD)"
            disableFocus={!onlyOneEditableUrineScreenType()}
            handleChange={(e) => handleEditDateChange(e)}
            handleKeyDown={(e) => handleEditSave(e)}
            inputClass={{ input: classes.editInput }}
            error={hasError()}
            readOnly={mostRecentEntry?.readonly}
          ></FormattedInput>
        </div>
      </React.Fragment>
    );
  };
  const getOneUrineScreenDisplayText = () => {
    let matchedType = editableUrineScreenTypes[0];
    if (matchedType) return matchedType.text;
    else return "";
  };
  const onlyOneEditableUrineScreenType = React.useCallback(() => {
    return editableUrineScreenTypes && editableUrineScreenTypes.length === 1;
  }, [editableUrineScreenTypes]);

  const hasEditableUrineScreenTypes = () => {
    return !onlyOneEditableUrineScreenType() && !noEditableUrineScreenTypes();
  };
  const noEditableUrineScreenTypes = () => {
    return !editableUrineScreenTypes || !editableUrineScreenTypes.length;
  };
  const getUrineScreenTypeSelectList = () => {
    return editableUrineScreenTypes.map((item, index) => {
      return (
        <MenuItem value={item.code} key={`${item.code}_${index}`}>
          <Typography variant="body2">{item.text}</Typography>
        </MenuItem>
      );
    });
  };
  const getSelectLookupTypes = () => {
    if (isEmptyArray(editableUrineScreenTypes)) return;
    let types = {};
    editableUrineScreenTypes.forEach((item) => {
      types[item.code] = item.text;
    });
    return types;
  };
  const handleSnackClose = (event, reason) => {
    if (event) event.stopPropagation();
    if (reason === "clickaway") {
      return;
    }
    dispatch({ type: "history/snack-close" });
  };
  const renderTitle = () => (
    <h3>{`Urine Drug Toxicology Screen for ${rowData.first_name} ${rowData.last_name}`}</h3>
  );
  const renderAddInProgressIndicator = () => {
    if (!historyState.addInProgress) return null;
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
    <Paper className={classes.itemContainer} elevation={1}>
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
                className: classes.dateInput,
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
      {!noEditableUrineScreenTypes() && (
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
        {onlyOneEditableUrineScreenType() && (
          <div className={classes.textDisplay}>
            <InputLabel className={classes.readonlyLabel}>
              {URINE_SCREEN_TYPE_LABEL}
            </InputLabel>
            <Typography variant="subtitle2">
              {getOneUrineScreenDisplayText()}
            </Typography>
          </div>
        )}
        {hasEditableUrineScreenTypes() && (
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
        {noEditableUrineScreenTypes() && (
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
  const columns = [
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
      lookup: !onlyOneEditableUrineScreenType() ? getSelectLookupTypes() : null,
      editable: !onlyOneEditableUrineScreenType() ? "always" : "never",
      render: (rowData) => {
        return <span>{rowData.text}</span>;
      },
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
    {
      title: "Source",
      field: "source",
      editable: false,
    },
  ];
  const renderMostRecentHistory = () => {
    if (!historyState.initialized || historyState.updateInProgress)
      return renderUpdateInProgressIndicator();
    const mostRecentEntry = historyState.mostRecentEntry;
    return (
      <Paper className={classes.recentEntryContainer} elevation={0}>
        <Typography
          variant="caption"
          display="block"
          className={classes.historyTitle}
        >
          Last Urine Drug Screen
        </Typography>
        {!hasHistory() && (
          <div
            style={{
              marginTop: "8px",
              marginBottom: "8px",
            }}
          >
            No previously recorded urine drug screen
          </div>
        )}
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
              {!mostRecentEntry.readonly && (
                <EditButtonGroup
                  onEnableEditMode={handleEnableEditMode}
                  onDisableEditMode={handleDisableEditMode}
                  isUpdateDisabled={!hasValidEditEntry()}
                  handleEditSave={() => handleEditSave()}
                  handleDelete={() => handleDelete()}
                  entryDescription={displayMostRecentEntry()}
                ></EditButtonGroup>
              )}
            </div>
            {/* alerts */}
            {isAdult(rowData.birth_date) && (
              <div className={classes.overDueContainer}>
                <OverdueAlert
                  date={mostRecentEntry.date}
                  type="urine drug screen"
                ></OverdueAlert>
              </div>
            )}
          </React.Fragment>
        )}
      </Paper>
    );
  };
  const renderHistory = () => (
    <Paper className={classes.itemContainer} elevation={0}>
      <Typography
        variant="caption"
        display="block"
        className={classes.historyTitle}
      >
        History
      </Typography>
      <div className={classes.totalEntriesContainer}>
        <span>
          <b>{historyState.data.length}</b> record(s)
        </span>
        {!historyState.expand && (
          <Button
            arial-label="expand"
            color="primary"
            onClick={() => dispatch({ type: "history/expand-toggle" })}
            endIcon={
              <ExpandMoreIcon className={classes.endIcon}></ExpandMoreIcon>
            }
            size="small"
            className={classes.expandIcon}
          >
            View
          </Button>
        )}
        {historyState.expand && (
          <Button
            arial-label="collapse"
            color="primary"
            onClick={() => dispatch({ type: "history/expand-toggle" })}
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
        {historyState.expand && (
          <div className="history-table">
            <HistoryTable
              data={historyState.data}
              columns={columns}
              APIURL="/fhir/ServiceRequest/"
              submitDataFormatter={submitDataFormatter}
              onRowUpdate={() => getHistory()}
              onRowDelete={() => getHistory()}
              options={{
                actionsCellStyle: {
                  width: "60%",
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
      open={historyState.snackOpen}
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

  const renderOrderInfo = () => {
    if (!historyState.orderInfoMessage) return null;
    return (
      <Alert
        message={historyState.orderInfoMessage}
        severity="warning"
        variant="standard"
        elevation={0}
        sx={{
          marginBottom: (theme) => theme.spacing(1),
        }}
      />
    );
  };

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
        {/* most recent entry */}
        {renderMostRecentHistory()}
        {/* UI for displaying message related to orders */}
        {renderOrderInfo()}
        {/* history */}
        {hasHistory() && renderHistory()}
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
