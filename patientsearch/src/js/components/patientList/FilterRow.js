import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import PropTypes from "prop-types";
import Search from "@mui/icons-material/Search";
import Phone from "@mui/icons-material/Phone";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import FormattedInput from "../../components/FormattedInput";
import {
  defaultSearchFields,
  LAUNCH_BUTTON_LABEL,
} from "../../constants/consts";
import { useActionLabel } from "../../stores/patientListSelectors";
import { useAppContext } from "../../context/PatientListContextProvider";
import { usePatientListStore } from "../../stores/patientListStore";
import RowData from "../../models/RowData";


const ICON_MAP = {
  phone: <Phone color="primary" />,
  search: <Search color="primary" />,
};

const fieldShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["text", "date", "masked", "number"]),
  placeholder: PropTypes.string,
  icon: PropTypes.oneOf(["phone", "search"]),
  mask: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  helperText: PropTypes.string,
  error: PropTypes.bool,
  showMask: PropTypes.bool,
  required: PropTypes.bool,
});

const buildEmptyFilters = (fields = []) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.type === "date" ? null : "";
    return acc;
  }, {});

const buildFilterData = (fields, filters) =>
  fields.reduce((acc, field) => {
    if (field.type === "date") {
      const dateValue = filters[field.name];
      if (dateValue && dayjs(dateValue).isValid()) acc[field.name] = dateValue;
    } else if (filters[field.name]?.trim()) {
      acc[field.name] = filters[field.name];
    }
    return acc;
  }, {});

const TextFieldInput = memo(function TextFieldInput({
  field,
  value,
  onChange,
  onKeyDown,
}) {
  return (
    <TextField
      variant="standard"
      margin="normal"
      id={field.name}
      placeholder={field.placeholder}
      name={field.name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      fullWidth
      inputProps={{ "data-lpignore": true }}
      InputProps={{
        startAdornment: field.icon ? (
          <InputAdornment position="start">
            {ICON_MAP[field.icon] ?? null}
          </InputAdornment>
        ) : null,
      }}
    />
  );
});

TextFieldInput.propTypes = {
  field: fieldShape.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
};

const DateFieldInput = memo(function DateFieldInput({
  field,
  value,
  onChange,
  onKeyDown,
  onClear,
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        openTo="year"
        disableFuture
        orientation="landscape"
        format="YYYY-MM-DD"
        minDate={dayjs("1900-01-01")}
        value={value ? dayjs(value) : null}
        onChange={onChange}
        slotProps={{
          textField: {
            placeholder: field.placeholder || "DOB: YYYY-MM-DD",
            id: field.name,
            variant: "standard",
            fullWidth: true,
            onKeyDown: onKeyDown,
            slotProps: {
              inputLabel: { shrink: true },
              htmlInput: { "data-lpignore": true },
            },
          },
          field: { clearable: true, onClear },
        }}
      />
    </LocalizationProvider>
  );
});

DateFieldInput.propTypes = {
  field: fieldShape.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

const MaskedFieldInput = memo(function MaskedFieldInput({
  field,
  value,
  onChange,
  onKeyDown,
}) {
  return (
    <FormattedInput
      value={value}
      handleChange={onChange}
      handleKeyDown={onKeyDown}
      mask={field?.mask ?? null}
      helperText={field.helperText}
      error={field.error}
      disableFocus
      placeholder={field.placeholder}
      showMask={field.showMask !== undefined ? field.showMask : false}
      className="field-wrapper"
    />
  );
});

MaskedFieldInput.propTypes = {
  field: fieldShape.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
};

const FieldWrapper = memo(function FieldWrapper({
  field,
  value,
  onTextChange,
  onDateChange,
  onDateClear,
  onKeyDown,
}) {
  let fieldContent;
  switch (field.type) {
    case "date":
      fieldContent = (
        <DateFieldInput
          field={field}
          value={value}
          onChange={onDateChange}
          onKeyDown={onKeyDown}
          onClear={onDateClear}
        />
      );
      break;
    case "masked":
      fieldContent = (
        <MaskedFieldInput
          field={field}
          value={value ?? ""}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
        />
      );
      break;
    case "text":
    default:
      fieldContent = (
        <TextFieldInput
          field={field}
          value={value ?? ""}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
        />
      );
  }

  return (
    <Box
      className={field.type === "date" ? "date-field-wrapper" : "field-wrapper"}
    >
      {fieldContent}
    </Box>
  );
});

FieldWrapper.propTypes = {
  field: fieldShape.isRequired,
  value: PropTypes.string,
  onTextChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onDateClear: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
};

  const { resetSearch, updateFilters, resetPagination, setError } =
    usePatientListStore.getState();

export default forwardRef(function FilterRow(_props, ref) {
  const filterTimeoutRef = useRef(null);
  const cloneTableRef = useRef(null);
  const {
    handleSearch,
    searchFields: rawFields = defaultSearchFields,
    tableRef,
  } = useAppContext();

  const actionLabel = useActionLabel() ?? "View";

  const getFields = useCallback(() => rawFields ?? [], [rawFields]);

  // fields config only changes when the actual field definitions change
  const fields = useMemo(() => getFields(), [getFields]);

  const onFiltersDidChange = useCallback(
    (filters) => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
      if (!cloneTableRef.current) return;
      filterTimeoutRef.current = setTimeout(() => {
        const safe = Array.isArray(filters) ? filters : [];
        const isEmpty = !safe.filter((f) => f.value).length;
        if (isEmpty) resetSearch({ currentFilters: {} });
        else
          updateFilters(safe);
        resetPagination();
        setError("");
        if (cloneTableRef.current) cloneTableRef.current.onQueryChange();
      }, 200);
    }, []
  );

  const [filters, setFilters] = React.useState(() => buildEmptyFilters(fields));

  const filtersArePresent = useMemo(
    () =>
      fields.some((field) =>
        field.type === "date"
          ? dayjs(filters[field.name]).isValid()
          : !!filters[field.name],
      ),
    [filters, fields],
  );

  const filtersAreComplete = useMemo(
    () =>
      fields
        .filter((f) => !!f.required)
        .every((f) =>
          f.type === "date"
            ? dayjs(filters[f.name]).isValid()
            : !!filters[f.name]?.trim(),
        ),
    [filters, fields],
  );

  const getCurrentFilters = useCallback(
    () => RowData.create(buildFilterData(fields, filters)).getData(),
    [fields, filters],
  );

  // One stable handler per field name. Using a ref-map means the identity of
  // each per-field handler is preserved across renders - FieldWrapper's memo
  // won't see new function references on unrelated keystrokes.
  const textChangeHandlersRef = useRef({});
  const getTextChangeHandler = useCallback(
    (fieldName) => {
      if (!textChangeHandlersRef.current[fieldName]) {
        textChangeHandlersRef.current[fieldName] = (event) => {
          let targetValue = event.target.value;
          const field = fields.find((f) => f.name === fieldName);
          if (field?.type === "masked" || field?.type === "number") {
            const digitsOnly = targetValue.replace(/\D/g, "");
            targetValue = digitsOnly === "" ? "" : digitsOnly;
          }
          setFilters((prev) => ({ ...prev, [fieldName]: targetValue }));
        };
      }
      return textChangeHandlersRef.current[fieldName];
    },
    [fields],
  );

  // Date change and clear handlers follow the same stable-ref pattern
  const dateChangeHandlersRef = useRef({});
  const getDateChangeHandler = useCallback((fieldName) => {
    if (!dateChangeHandlersRef.current[fieldName]) {
      dateChangeHandlersRef.current[fieldName] = (
        newValue,
        validationContext,
      ) => {
        if (validationContext?.validationError) {
          setFilters((prev) => ({ ...prev, [fieldName]: newValue.format() }));
          return;
        }
        setFilters((prev) => ({
          ...prev,
          [fieldName]: newValue ? newValue.format("YYYY-MM-DD") : null,
        }));
      };
    }
    return dateChangeHandlersRef.current[fieldName];
  }, []);

  const dateClearHandlersRef = useRef({});
  const getDateClearHandler = useCallback((fieldName) => {
    if (!dateClearHandlersRef.current[fieldName]) {
      dateClearHandlersRef.current[fieldName] = () =>
        setFilters((prev) => ({ ...prev, [fieldName]: null }));
    }
    return dateClearHandlersRef.current[fieldName];
  }, []);

  const handleClear = useCallback(() => {
    setFilters(buildEmptyFilters(fields));
    onFiltersDidChange(null);
  }, [fields, onFiltersDidChange]);

  const handleKeyDown = useCallback(
    (e) => {
      if (String(e.key).toLowerCase() === "spacebar") e.stopPropagation();
      if (String(e.key).toLowerCase() === "enter") {
        handleSearchRef.current(getCurrentFilters());
      }
    },
    [getCurrentFilters],
  );

  useImperativeHandle(ref, () => ({ clear: handleClear }), [handleClear]);

  const isMountedRef = useRef(false);

  // Notify parent of filter changes after each state update
  useEffect(() => {
    // Skip the first run - no filters have changed yet, just mounted
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    const filterData = buildFilterData(fields, filters);
    onFiltersDidChange(RowData.create(filterData).getFilters());
  }, [filters, fields, onFiltersDidChange]);


  const handleSearchRef = useRef(handleSearch);

  useEffect(
    () => () => {
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    },
    [],
  );
  useEffect(() => {
    if (!tableRef?.current) return;
    if (cloneTableRef.current) return;
    cloneTableRef.current = tableRef.current;
  }, [tableRef]);
  useEffect(() => {
    if (handleSearchRef.current) return;
    handleSearchRef.current = handleSearch;
  }, [handleSearch]);
  const launchButtonLabel = actionLabel || LAUNCH_BUTTON_LABEL;

  return (
    <Box className="search-container">
      <Box className="fields-container">
        {fields.map((field) => (
          <FieldWrapper
            key={field.name}
            field={field}
            value={filters[field.name]}
            onTextChange={getTextChangeHandler(field.name)}
            onDateChange={getDateChangeHandler(field.name)}
            onDateClear={getDateClearHandler(field.name)}
            onKeyDown={handleKeyDown}
          />
        ))}
      </Box>
      <Box className="toolbar-container">
        <Button
          className={!filtersAreComplete ? "disabled" : ""}
          color="primary"
          size="small"
          variant="contained"
          onClick={() => handleSearchRef.current(getCurrentFilters())}
        >
          {launchButtonLabel}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleClear}
          className={!filtersArePresent ? "disabled" : ""}
          id="btnClear"
          title="Clear search"
        >
          Clear
        </Button>
      </Box>
    </Box>
  );
});
