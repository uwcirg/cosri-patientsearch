import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useCallback,
  useRef,
} from "react";
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

const LAUNCH_BUTTON_LABEL = "VIEW";

const buildEmptyFilters = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.type === "date" ? null : "";
    return acc;
  }, {});

const buildFilterData = (fields, filters) => {
  return fields.reduce((acc, field) => {
    if (field.type === "date") {
      const dateValue = filters[field.name];
      if (dateValue && dayjs(dateValue).isValid()) {
        acc[field.name] = dateValue;
      }
    } else if (filters[field.name]?.trim()) {
      acc[field.name] = filters[field.name];
    }
    return acc;
  }, {});
};

export default forwardRef(function FilterRow(_props, ref) {
  const { childrenProps = {} } = usePatientListContext();

  const {
    actionLabel = "",
    handleSearch,
    onFiltersDidChange,
    fields: rawFields = defaultSearchFields,
  } = childrenProps["filterRow"] ?? {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fields = useMemo(() => rawFields, [JSON.stringify(rawFields)]); 
  const onFiltersDidChangeRef = useRef(onFiltersDidChange);
  useEffect(() => {
    onFiltersDidChangeRef.current = onFiltersDidChange;
  });

  const [filters, setFilters] = React.useState(() => buildEmptyFilters(fields));

  const filtersArePresent = useMemo(
    () =>
      fields.some((field) => {
        if (field.type === "date") return dayjs(filters[field.name]).isValid();
        return !!filters[field.name];
      }),
    [filters, fields],
  );

  const filtersAreComplete = useMemo(
    () =>
      fields
        .filter((field) => !!field.required)
        .every((field) => {
          if (field.type === "date")
            return dayjs(filters[field.name]).isValid();
          return !!filters[field.name]?.trim();
        }),
    [filters, fields],
  );

  const getCurrentFilters = useCallback(() => {
    const filterData = buildFilterData(fields, filters);
    return RowData.create(filterData).getData();
  }, [fields, filters]);

  const getFilterData = useCallback(() => {
    if (!filtersAreComplete) return null;
    return getCurrentFilters();
  }, [filtersAreComplete, getCurrentFilters]);

  const handleFieldChange = useCallback(
    (fieldName) => (event) => {
      let targetValue = event.target.value;
      const field = fields.find((f) => f.name === fieldName);

      if (field?.type === "masked" || field?.type === "number") {
        const digitsOnly = targetValue.replace(/\D/g, "");
        targetValue = digitsOnly === "" ? "" : digitsOnly;
      }

      setFilters((prev) => ({ ...prev, [fieldName]: targetValue }));
    },
    [fields],
  );

  const handleClear = useCallback(() => {
    setFilters(buildEmptyFilters(fields));
    if (onFiltersDidChangeRef.current) onFiltersDidChangeRef.current(null);
  }, [fields]);

  const launchButtonLabel = actionLabel || LAUNCH_BUTTON_LABEL;

  const handleKeyDown = useCallback(
    (e) => {
      const pressedKey = String(e.key).toLowerCase();
      if (pressedKey === "spacebar") {
        e.stopPropagation();
      }
      if (pressedKey === "enter") {
        if (!filtersAreComplete) return;
        handleSearch(getFilterData());
      }
    },
    [filtersAreComplete, handleSearch, getFilterData],
  );

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
            onClear: () =>
              setFilters((prev) => ({ ...prev, [field.name]: null })),
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
            setFilters((prev) => ({
              ...prev,
              [field.name]: newValue.format(),
            }));
            return;
          }
          setFilters((prev) => ({
            ...prev,
            [field.name]: newValue ? newValue.format("YYYY-MM-DD") : null,
          }));
        }}
        KeyboardButtonProps={{ color: "primary", title: "Date picker" }}
      />
    </LocalizationProvider>
  );

  const renderMaskedField = (field) => {
    const mask = field?.mask ?? null;
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
          return renderMaskedField(field);
        case "text":
        default:
          return renderTextField(field);
      }
    })();

    return (
      <Box
        key={field.name}
        className={
          field.type === "date" ? "date-field-wrapper" : "field-wrapper"
        }
      >
        {fieldContent}
      </Box>
    );
  };

  const renderLaunchButton = () => (
    <Button
      className={!filtersAreComplete ? "disabled" : ""}
      color="primary"
      size="small"
      variant="contained"
      onClick={() => handleSearch(getFilterData())}
    >
      {launchButtonLabel}
    </Button>
  );

  const renderClearButton = () => (
    <Tooltip title="Clear search fields">
      <Button
        variant="contained"
        size="small"
        onClick={handleClear}
        className={!filtersArePresent ? "disabled" : ""}
        id="btnClear"
      >
        Clear
      </Button>
    </Tooltip>
  );

  useEffect(() => {
    const filterData = buildFilterData(fields, filters);
    const oData = RowData.create(filterData);
    if (onFiltersDidChangeRef.current) {
      onFiltersDidChangeRef.current(oData.getFilters());
    }
  }, [filters, fields]);

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
