import React, { forwardRef, useEffect, useImperativeHandle } from "react";
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
import { defaultSearchFields } from "../../constants/consts";
import { usePatientListContext } from "../../context/PatientListContextProvider";
import RowData from "../../models/RowData";


export default forwardRef((props, ref) => {
  let { childrenProps = {} } = usePatientListContext();

  const {
    actionLabel = "",
    handleSearch,
    onFiltersDidChange,
    fields = defaultSearchFields,
  } = childrenProps["filterRow"] ?? {};

  const LAUNCH_BUTTON_LABEL = "VIEW";

  const initialFilters = fields.reduce((acc, field) => {
    acc[field.name] = field.type === "date" ? null : "";
    return acc;
  }, {});

  const [filters, setFilters] = React.useState(initialFilters);

  const getDateInput = (fieldName = "birthDate") =>
    dayjs(filters[fieldName]).isValid() ? filters[fieldName] : "";

  const handleFilterChange = () => {
    // Build filter data with only valid values
    const filterData = {};

    fields.forEach((field) => {
      if (field.type === "date") {
        // Only include valid dates
        const dateValue = getDateInput(field.name);
        if (dateValue && dayjs(dateValue).isValid()) {
          filterData[field.name] = dateValue;
        }
      } else {
        // Only include non-empty values
        if (filters[field.name] && filters[field.name].trim() !== "") {
          filterData[field.name] = filters[field.name];
        }
      }
    });
    const oData = RowData.create(filterData);
    if (onFiltersDidChange) onFiltersDidChange(oData.getFilters());
  };

  const handleFieldChange = (fieldName) => (event) => {
    let targetValue = event.target.value;

    const field = fields.find((f) => f.name === fieldName);

    if (
      field?.type === "masked" ||
      field?.type === "number"
    ) {
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
    return fields
      .filter((field) => !!field.required) // Only check required fields
      .every((field) => {
        if (field.type === "date") {
          return dayjs(filters[field.name]).isValid();
        }
        return filters[field.name] && filters[field.name].trim() !== "";
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
        // Only include date if it's valid
        const dateValue = getDateInput(field.name);
        if (dayjs(dateValue).isValid()) {
          filterData[field.name] = dateValue;
        } else {
          filterData[field.name] = "";
        }
      } else {
        // Only include non-empty values
        if (filters[field.name] && filters[field.name].trim() !== "") {
          filterData[field.name] = filters[field.name];
        }
      }
    });

    const oData = RowData.create(filterData);
    return oData.getData();
  };

  const handleClear = () => {
    clearFields();
    if (onFiltersDidChange) onFiltersDidChange(null);
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
            inputProps: { "data-lpignore": true },
            id: field.name,
            variant: "standard",
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

  const renderMaskedField = (field) => {
    let mask = field?.mask ? field.mask : null;
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
        inputClass="field-wrapper"
      />
    );
  };

  const renderField = (field) => {
    const fieldContent = (() => {
      switch (field.type) {
        case "date":
          return renderDateField(field);
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
            ? "date-field-wrapper"
            : "field-wrapper"
        }
      >
        {fieldContent}
      </Box>
    );
  };

  const renderLaunchButton = () => (
    <Button
      className={
        !hasCompleteFilters() ? "disabled" : ""
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
        className={!hasFilter() ? "disabled" : ""}
        id="btnClear"
      >
        Clear
      </Button>
    </Tooltip>
  );

  useEffect(() => {
    handleFilterChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
