import React from "react";
import PropTypes from "prop-types";
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
import theme from "../context/theme";

const useStyles = makeStyles({
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
    width: "20%",
    backgroundColor: "#f7f7f7",
  },
});
export default function FilterRow(props) {
  const classes = useStyles();
  const LAUNCH_BUTTON_LABEL = "VIEW";
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [date, setDate] = React.useState(null);
  const [dateInput, setDateInput] = React.useState(null);
  const trimFilterValue = (val) => !val?"":val.trim();
  const handleFirstNameChange = (event) => {
    let targetValue = trimFilterValue(event.target.value);
    setFirstName(targetValue);
    props.onFiltersDidChange([
      {
        field: "first_name",
        value: targetValue,
      },
      {
        field: "last_name",
        value: lastName,
      },
      {
        field: "dob",
        value: isValid(new Date(dateInput)) ? dateInput : "",
      },
    ]);
  };
  const handleLastNameChange = (event) => {
    let targetValue = trimFilterValue(event.target.value);
    setLastName(targetValue);
    props.onFiltersDidChange([
      {
        field: "last_name",
        value: targetValue,
      },
      {
        field: "first_name",
        value: firstName,
      },
      {
        field: "dob",
        value: isValid(new Date(dateInput)) ? dateInput : "",
      },
    ]);
  };
  const hasFilter = () => {
    return firstName || lastName || dateInput;
  };
  const hasCompleteFilters = () => {
    return firstName && lastName && (dateInput && isValid(new Date(dateInput)));
  };
  const getFilterData = () => {
    if (!hasCompleteFilters()) return null;
    return getCurrentFilters();
  };
  const getCurrentFilters = () => {
    return {
      first_name: firstName,
      last_name: lastName,
      dob: dateInput,
    };
  };
  const clearDate = () => {
    setDate(null);
    setDateInput("");
    props.onFiltersDidChange([
      {
        field: "first_name",
        value: firstName,
      },
      {
        field: "last_name",
        value: lastName,
      },
      {
        field: "dob",
        value: null,
      },
    ]);
  };
  const clearFields = () => {
    setFirstName("");
    setLastName("");
    clearDate();
    props.onFiltersDidChange(null, true);
  };
  const getLaunchButtonLabel = () => {
    return props.launchButtonLabel
      ? props.launchButtonLabel
      : LAUNCH_BUTTON_LABEL;
  };
  const handleKeyDown = (e) => {
    if (String(e.key).toLowerCase() === "enter") {
      props.launchFunc(e, getFilterData());
      return;
    }
    return false;
  };
  return (
    <tr className={classes.row} key="filterRow">
      <td className={classes.cell}>
        {/* first name field */}
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
      </td>
      <td className={classes.cell}>
        {/* last name field */}
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
      </td>
      <td className={classes.dateCell}>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          {/* birth date field */}
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
                // props.onFilterChanged(3, null, "dob");
                props.onFiltersDidChange([
                  {
                    field: "first_name",
                    value: firstName,
                  },
                  {
                    field: "last_name",
                    value: lastName,
                  },
                  {
                    field: "dob",
                    value: null,
                  },
                ]);
                return;
              }
              setDate(event);
              //   props.onFilterChanged(3, dateString, "dob");
              props.onFiltersDidChange([
                {
                  field: "first_name",
                  value: firstName,
                },
                {
                  field: "last_name",
                  value: lastName,
                },
                {
                  field: "dob",
                  value: dateString,
                },
              ]);
            }}
            KeyboardButtonProps={{ color: "primary", title: "Date picker" }}
          />
        </MuiPickersUtilsProvider>
      </td>
      <td className={classes.empty}></td>
      <td className={classes.toolbarCell}>
        {/* toolbar go button */}
        <Button
          id={props.launchButtonId}
          className={
            !hasCompleteFilters()
              ? `${classes.button} disabled`
              : classes.button
          }
          color="primary"
          size="small"
          variant="contained"
          onClick={(e) => props.launchFunc(e, getFilterData())}
        >
          {getLaunchButtonLabel()}
        </Button>
        <Tooltip title="Clear search fields">
          <Button
            variant="contained"
            size="small"
            onClick={clearFields}
            className={
              !hasFilter() ? `${classes.button} disabled` : classes.button
            }
            id="btnClear"
          >
            Clear
          </Button>
        </Tooltip>
      </td>
    </tr>
  );
}

FilterRow.propTypes = {
  onFiltersDidChange: PropTypes.func.isRequired,
  launchButtonLabel: PropTypes.string,
  launchFunc: PropTypes.func,
  launchButtonId: PropTypes.string
};
