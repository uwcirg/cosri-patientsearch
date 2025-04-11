import React, { forwardRef, useImperativeHandle } from "react";
import makeStyles from "@mui/styles/makeStyles";
import Search from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
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

export default forwardRef((props, ref) => {
  let { childrenProps = {} } = usePatientListContext();

  const { actionLabel, handleSearch, onFiltersDidChange } = childrenProps["filterRow"];
  const classes = useStyles();
  const LAUNCH_BUTTON_LABEL = "VIEW";
  const [filters, setFilters] = React.useState({
    firstName: "",
    lastName: "",
    birthDate: null,
  });
  const getDateInput = () =>
    dayjs(filters.birthDate).isValid() ? filters.birthDate : "";
  const handleFilterChange = (firstName, lastName, birthDate) => {
    const oData = RowData.create(firstName, lastName, birthDate);
    onFiltersDidChange(oData.getFilters());
  };
  const handleFirstNameChange = (event) => {
    let targetValue = event.target.value;
    setFilters({
      ...filters,
      firstName: targetValue,
    });
    handleFilterChange(targetValue, filters.lastName, getDateInput());
  };
  const handleLastNameChange = (event) => {
    let targetValue = event.target.value;
    setFilters({
      ...filters,
      lastName: targetValue,
    });
    handleFilterChange(filters.firstName, targetValue, getDateInput());
  };
  const hasFilter = () => {
    return filters.firstName || filters.lastName || filters.birthDate;
  };
  const hasCompleteFilters = () => {
    return (
      filters.firstName &&
      filters.lastName &&
      dayjs(filters.birthDate).isValid()
    );
  };
  const getFilterData = () => {
    if (!hasCompleteFilters()) return null;
    return getCurrentFilters();
  };
  const getCurrentFilters = () => {
    const oData = RowData.create(
      filters.firstName,
      filters.lastName,
      getDateInput()
    );
    return oData.getData();
  };
  const handleClear = () => {
    clearFields();
    onFiltersDidChange(null);
  };
  const clearFields = () => {
    setFilters({
      firstName: "",
      lastName: "",
      birthDate: null,
    });
  };
  const getLaunchButtonLabel = (actionLabel) => {
    return actionLabel ? actionLabel : LAUNCH_BUTTON_LABEL;
  };
  const handleKeyDown = (e) => {
    const pressedKey = String(e.key).toLowerCase();
    if (pressedKey === "spacebar") {
      e.stopPropagation();
    }
    if (pressedKey === "enter") {
      if (!hasCompleteFilters()) return;
      handleSearch(getFilterData());
      return;
    }
    return false;
  };
  useImperativeHandle(ref, () => ({
    clear() {
      handleClear();
    },
  }));
  const renderFirstNameField = () => (
    <TextField
      variant="standard"
      margin="normal"
      id="firstName"
      placeholder="First Name"
      name="firstName"
      value={filters.firstName}
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
      value={filters.lastName}
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
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {/* birth date field */}
      <DatePicker
        autoOk={true}
        variant="dialog"
        openTo="year"
        disableFuture
        slotProps={{
          textField: {
            placeholder: "YYYY-MM-DD",
            InputLabelProps: { shrink: true },
            id: "birthDate",
            variant: "standard",
            className: classes.dateInput,
          },
          field: {
            clearable: true,
            onClear: () => {
              setFilters({
                ...filters,
                birthDate: null,
              });
              handleFilterChange(filters.firstName, filters.lastName, null);
            },
          },
        }}
        format="YYYY-MM-DD"
        key="ftBirthDate"
        minDate={dayjs("1900-01-01")}
        invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
        value={filters.birthDate ? dayjs(filters.birthDate) : null}
        orientation="landscape"
        clearable={true}
        sx={{ width: 260 }}
        onKeyDown={handleKeyDown}
        onChange={(newValue, validationContext) => {
          if (validationContext?.validationError) {
            setFilters({
              ...filters,
              birthDate: newValue.format(),
            });
            handleFilterChange(filters.firstName, filters.lastName, null);
            return;
          }
          setFilters({
            ...filters,
            birthDate: newValue ? newValue.format("YYYY-MM-DD") : null,
          });
          handleFilterChange(
            filters.firstName,
            filters.lastName,
            newValue.format("YYYY-MM-DD")
          );
        }}
        KeyboardButtonProps={{ color: "primary", title: "Date picker" }}
      />
    </LocalizationProvider>
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
      {getLaunchButtonLabel(actionLabel)}
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
    <table className="bottom-gap">
      <tbody>
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
          <td className={classes.toolbarCell} colSpan={2}>
            {/* toolbar go button */}
            {renderLaunchButton()}
            {renderClearButton()}
          </td>
        </tr>
      </tbody>
    </table>
  );
});
