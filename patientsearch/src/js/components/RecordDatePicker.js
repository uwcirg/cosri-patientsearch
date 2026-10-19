import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DATE_FORMAT } from "../helpers/utility";

const MIN_DATE = dayjs("1950-01-01");
const ERROR_MESSAGES = {
  invalidDate: "Date must be in YYYY-MM-DD format, e.g. 1977-01-12",
  disableFuture: "Date must not be in the future",
  minDate: "Date must not be earlier than 1950-01-01",
};

/**
 * Labelled "Add New" date picker shared by the history panels.
 *
 * Controlled with the raw dayjs value (or null). The parent derives the
 * submittable "YYYY-MM-DD" string with toDateString(value, error).
 */
export default function RecordDatePicker({
  label,
  value,
  onChange,
  error,
  onErrorChange,
  onKeyDown,
  autoFocus = true,
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <InputLabel sx={(theme) => ({ fontSize: "12px", marginBottom: theme.spacing(0.25) })}>
        {label}
      </InputLabel>
      <DatePicker
        openTo="day"
        disableFuture
        orientation="landscape"
        format={DATE_FORMAT}
        minDate={MIN_DATE}
        value={value}
        onChange={(newValue) => onChange(newValue ?? null)}
        onError={(reason) =>
          onErrorChange(reason ? ERROR_MESSAGES[reason] || "Invalid date" : "")
        }
        slotProps={{
          textField: {
            placeholder: DATE_FORMAT,
            variant: "standard",
            sx: { minWidth: "248px" },
            autoFocus,
            onKeyDown,
            error: !!error,
            slotProps: {
              inputLabel: { shrink: true },
            },
          },
          openPickerIcon: {
            sx: { color: "primary.main" },
          },
        }}
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </LocalizationProvider>
  );
}

RecordDatePicker.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.object, // dayjs instance or null
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  onErrorChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func,
  autoFocus: PropTypes.bool,
};
