import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import DateFnsUtils from "@date-io/date-fns";
import isValid from "date-fns/isValid";
import ClearIcon from "@material-ui/icons/Clear";
import Search from "@material-ui/icons/Search";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import TextField from "@material-ui/core/TextField";
import Tooltip from "@material-ui/core/Tooltip";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { usePatientListContext } from "../../context/PatientListContextProvider";
import RowData from "../../models/RowData";

const useStyles = makeStyles((theme) => ({
  row: {
    border: "2px solid #ececec !important",
  },
  cell: {
    padding: theme.spacing(0, 2, 1),
    backgroundColor: "#f7f7f7",
  },
  dateCell: {
    padding: theme.spacing(0.5, 2, 0.5),
    backgroundColor: "#f7f7f7",
  },
  toolbarCell: {
    paddingTop: theme.spacing(1),
    textAlign: "left",
    backgroundColor: "#f7f7f7",
    minWidth: "180px",
  },
  button: {
    margin: theme.spacing(0.5),
    fontWeight: 500,
    textTransform: "uppercase",
    border: 0,
  },
  dateInput: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  empty: {
    width: "24px",
    backgroundColor: "#f7f7f7",
  },
}));

export default function FilterRow() {
  let {
    //methods
    handleSearch = function () {
      console.log("handleSearch is not defined.  Unable to search.");
    },
    onFiltersDidChange = function () {
      console.log("onFiltersDidChange is not defined.");
    },
    //states/set state methods
    actionLabel,
  } = usePatientListContext();

  const classes = useStyles();
  const LAUNCH_BUTTON_LABEL = "VIEW";
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [date, setDate] = React.useState(null);
  const [dateInput, setDateInput] = React.useState(null);
  const getDateInput = () => (isValid(new Date(dateInput)) ? dateInput : "");
  const handleFilterChange = (firstName, lastName, birthDate) => {
    const oData = RowData.create(firstName, lastName, birthDate);
    onFiltersDidChange(oData.getFilters());
  };
  const handleFirstNameChange = (event) => {
    let targetValue = event.target.value;
    setFirstName(targetValue);
    handleFilterChange(targetValue, lastName, getDateInput());
  };
  const handleLastNameChange = (event) => {
    let targetValue = event.target.value;
    setLastName(targetValue);
    handleFilterChange(firstName, targetValue, getDateInput());
  };
  const hasFilter = () => {
    return firstName || lastName || dateInput;
  };
  const hasCompleteFilters = () => {
    return firstName && lastName && dateInput && isValid(new Date(dateInput));
  };
  const getFilterData = () => {
    if (!hasCompleteFilters()) return null;
    return getCurrentFilters();
  };
  const getCurrentFilters = () => {
    const oData = RowData.create(firstName, lastName, getDateInput());
    return oData.getData();
  };
  const clearDate = () => {
    setDateInput("");
    setDate(null);
    handleFilterChange(firstName, lastName, null);
  };
  const handleClear = () => {
    clearFields();
    onFiltersDidChange(null);
  };
  const clearFields = () => {
    setFirstName("");
    setLastName("");
    clearDate();
  };
  const getLaunchButtonLabel = () => {
    return actionLabel ? actionLabel : LAUNCH_BUTTON_LABEL;
  };
  const handleKeyDown = (e) => {
    const pressedKey = String(e.key).toLowerCase();
    if (pressedKey === "spacebar") {
      e.stopPropagation();
    }
    if (pressedKey === "enter") {
      handleSearch(getFilterData());
      return;
    }
    return false;
  };
  const renderFirstNameField = () => (
    <TextField
      variant="standard"
      margin="normal"
      id="firstName"
      placeholder="First Name"
      name="firstName"
      value={firstName}
      onChange={handleFirstNameChange}
      onKeyDown={handleKeyDown}
      key="ftFirstName"
      inputProps={{ "data-lpignore": true }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search color="primary" />
          </InputAdornment>
        ),
      }}
    />
  );
  const renderLastNameField = () => (
    <TextField
      variant="standard"
      margin="normal"
      name="lastName"
      placeholder="Last Name"
      id="lastName"
      key="ftLastName"
      value={lastName}
      onChange={handleLastNameChange}
      onKeyDown={handleKeyDown}
      inputProps={{ "data-lpignore": true }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search color="primary" />
          </InputAdornment>
        ),
      }}
    />
  );
  const renderDOBField = () => (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      {/* birth date field */}
      <KeyboardDatePicker
        autoOk={true}
        variant="dialog"
        openTo="year"
        disableFuture
        InputProps={{
          startAdornment: (
            <InputAdornment position="end" style={{ order: 1, marginLeft: 0 }}>
              <IconButton
                onClick={() => {
                  clearDate();
                }}
                style={{ order: 2, padding: 0 }}
                aria-label="Clear date"
                title="Clear date"
                tabIndex={-1}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
          className: classes.dateInput,
        }}
        format="yyyy-MM-dd"
        id="birthDate"
        key="ftBirthDate"
        minDate={new Date("1900-01-01")}
        invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
        placeholder="YYYY-MM-DD"
        value={date}
        orientation="landscape"
        onKeyDown={handleKeyDown}
        onChange={(event, dateString) => {
          setDateInput(dateString);
          if (!event || !isValid(event)) {
            if (event && String(dateInput).replace(/[-_]/g, "").length >= 8)
              setDate(event);
            handleFilterChange(firstName, lastName, null);
            return;
          }
          setDate(event);
          handleFilterChange(firstName, lastName, dateString);
        }}
        KeyboardButtonProps={{ color: "primary", title: "Date picker" }}
      />
    </MuiPickersUtilsProvider>
  );
  const renderLaunchButton = () => (
    <Button
      className={
        !hasCompleteFilters() ? `${classes.button} disabled` : classes.button
      }
      color="primary"
      size="small"
      variant="contained"
      onClick={() => handleSearch(getFilterData())}
    >
      {getLaunchButtonLabel()}
    </Button>
  );
  const renderClearButton = () => (
    <Tooltip title="Clear search fields">
      <Button
        variant="contained"
        size="small"
        onClick={handleClear}
        className={!hasFilter() ? `${classes.button} disabled` : classes.button}
        id="btnClear"
      >
        Clear
      </Button>
    </Tooltip>
  );
  return (
    <tr className={classes.row} key="filterRow">
      <td className={classes.cell}>
        {/* first name field */}
        {renderFirstNameField()}
      </td>
      <td className={classes.cell}>
        {/* last name field */}
        {renderLastNameField()}
      </td>
      <td className={classes.dateCell}>{renderDOBField()}</td>
      <td className={classes.empty}></td>
      <td className={classes.toolbarCell}>
        {/* toolbar go button */}
        {renderLaunchButton()}
        {renderClearButton()}
      </td>
    </tr>
  );
}
