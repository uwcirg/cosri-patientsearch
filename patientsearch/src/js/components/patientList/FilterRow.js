import React, { forwardRef, useEffect, useImperativeHandle } from "react";
import makeStyles from "@mui/styles/makeStyles";
import Search from "@mui/icons-material/Search";
import Phone from "@mui/icons-material/Phone";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import FormattedInput from "../../components/FormattedInput";
import { usePatientListContext } from "../../context/PatientListContextProvider";
import RowData from "../../models/RowData";

const useStyles = makeStyles((theme) => ({
  fieldWrapper: {
    minWidth: "100px",
    maxWidth: "150px",
    [theme.breakpoints.down("sm")]: {
      flex: "1 1 100%",
      maxWidth: "100%",
    },
  },
  dateFieldWrapper: {
    minWidth: "150px",
    [theme.breakpoints.down("sm")]: {
      flex: "1 1 100%",
      minWidth: "auto",
    },
  },
  button: {
    margin: theme.spacing(0.25),
    fontWeight: 500,
    textTransform: "uppercase",
    border: 0,
  },
  dateInput: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

// Default field configurations
const DEFAULT_FIELDS = [
  {
    name: "given",
    type: "text",
    placeholder: "First Name",
    icon: "search",
  },
  { name: "name", type: "text", placeholder: "Last Name", icon: "search" },
  { name: "birthdate", type: "date", placeholder: "YYYY-MM-DD" },
];

export default forwardRef((props, ref) => {
  let { childrenProps = {} } = usePatientListContext();

  const {
    actionLabel = "",
    handleSearch,
    onFiltersDidChange,
    fields = DEFAULT_FIELDS,
  } = childrenProps["filterRow"] ?? {};

  const classes = useStyles();
  const LAUNCH_BUTTON_LABEL = "VIEW";

  const initialFilters = fields.reduce((acc, field) => {
    acc[field.name] = field.type === "date" ? null : "";
    return acc;
  }, {});

  const [filters, setFilters] = React.useState(initialFilters);

  const getDateInput = (fieldName = "birthDate") =>
    dayjs(filters[fieldName]).isValid() ? filters[fieldName] : "";

  const handleFilterChange = () => {
    const oData = RowData.createFromFields(fields, filters);
    if (onFiltersDidChange)
        onFiltersDidChange(oData.getFilters());
  };

  const handleFieldChange = (fieldName) => (event) => {
    let targetValue = event.target.value;

    const field = fields.find((f) => f.name === fieldName);

    if (field?.type === "masked") {
      const digitsOnly = targetValue.replace(/\D/g, "");
      targetValue = digitsOnly === "" ? "" : digitsOnly;
    }

    setFilters({
      ...filters,
      [fieldName]: targetValue,
    });
  };

  const hasFilter = () => {
    return fields.some((field) => {
      if (field.type === "date") {
        return dayjs(filters[field.name]).isValid();
      }
      return filters[field.name];
    });
  };

  const hasCompleteFilters = () => {
    return fields.every((field) => {
      if (field.type === "date") {
        return dayjs(filters[field.name]).isValid();
      }
      return filters[field.name];
    });
  };

  const getFilterData = () => {
    if (!hasCompleteFilters()) return null;
    return getCurrentFilters();
  };

  const getCurrentFilters = () => {
    const filterData = {};
    fields.forEach((field) => {
      if (field.type === "date") {
        filterData[field.name] = getDateInput(field.name);
      } else {
        filterData[field.name] = filters[field.name];
      }
    });

    const oData = RowData.create(filterData);
    return oData.getData();
  };

  const handleClear = () => {
    clearFields();
    onFiltersDidChange(null);
  };

  const clearFields = () => {
    const clearedFilters = {};
    fields.forEach((field) => {
      clearedFilters[field.name] = field.type === "date" ? null : "";
    });
    setFilters(clearedFilters);
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

  const getIcon = (iconType) => {
    switch (iconType) {
      case "phone":
        return <Phone color="primary" />;
      case "search":
        return <Search color="primary" />;
      default:
        return null;
    }
  };

  const renderTextField = (field) => (
    <TextField
      variant="standard"
      margin="normal"
      id={field.name}
      placeholder={field.placeholder}
      name={field.name}
      value={filters[field.name] || ""}
      onChange={handleFieldChange(field.name)}
      onKeyDown={handleKeyDown}
      key={`ft${field.name}`}
      fullWidth
      inputProps={{ "data-lpignore": true }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            {getIcon(field.icon)}
          </InputAdornment>
        ),
      }}
    />
  );

  const renderDateField = (field) => (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        autoOk={true}
        variant="dialog"
        openTo="year"
        disableFuture
        slotProps={{
          textField: {
            placeholder: field.placeholder || "YYYY-MM-DD",
            InputLabelProps: { shrink: true },
            id: field.name,
            variant: "standard",
            className: classes.dateInput,
            fullWidth: true,
          },
          field: {
            clearable: true,
            onClear: () => {
              setFilters({
                ...filters,
                [field.name]: null,
              });
            },
          },
        }}
        format="YYYY-MM-DD"
        key={`ft${field.name}`}
        minDate={dayjs("1900-01-01")}
        invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
        value={filters[field.name] ? dayjs(filters[field.name]) : null}
        orientation="landscape"
        clearable={true}
        sx={{ width: "100%" }}
        onKeyDown={handleKeyDown}
        onChange={(newValue, validationContext) => {
          if (validationContext?.validationError) {
            setFilters({
              ...filters,
              [field.name]: newValue.format(),
            });
            return;
          }
          setFilters({
            ...filters,
            [field.name]: newValue ? newValue.format("YYYY-MM-DD") : null,
          });
        }}
        KeyboardButtonProps={{ color: "primary", title: "Date picker" }}
      />
    </LocalizationProvider>
  );

  const renderMaskedField = (field, type) => {
    let mask = field?.mask ? field.mask : null;
    // make this a function
    if (!mask) {
      if (type === "phone") {
        mask = [
          "(",
          /[1-9]/,
          /\d/,
          /\d/,
          ")",
          " ",
          /\d/,
          /\d/,
          /\d/,
          "-",
          /\d/,
          /\d/,
          /\d/,
          /\d/,
        ];
      }
    }
    return (
      <FormattedInput
        value={filters[field.name] || ""}
        handleChange={handleFieldChange(field.name)}
        handleKeyDown={handleKeyDown}
        mask={mask}
        helperText={field.helperText}
        error={field.error}
        disableFocus={true}
        placeholder={field.placeholder}
        showMask={field.showMask !== undefined ? field.showMask : false}
      />
    );
  };

  const renderField = (field) => {
    const fieldContent = (() => {
      switch (field.type) {
        case "date":
          return renderDateField(field);
        case "phone":
        case "masked":
          return renderMaskedField(field, field.type);
        case "text":
        default:
          return renderTextField(field);
      }
    })();

    return (
      <Box
        key={field.name}
        className={
          field.type === "date"
            ? classes.dateFieldWrapper
            : classes.fieldWrapper
        }
      >
        {fieldContent}
      </Box>
    );
  };

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

  useEffect(() => {
    handleFilterChange();
  }, [filters]);

  return (
    <Box className="search-container">
      <Box className="fields-container">
        {fields.map((field) => renderField(field))}
      </Box>
      <Box className="toolbar-container">
        {renderLaunchButton()}
        {renderClearButton()}
      </Box>
    </Box>
  );
});
