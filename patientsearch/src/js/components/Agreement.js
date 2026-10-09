import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PrintIcon from "@mui/icons-material/Print";
import dayjs from "dayjs";
import EditButtonGroup from "./EditButtonGroup";
import FormattedInput from "./FormattedInput";
import OverdueAlert from "./OverdueAlert";
import HistorySection from "./HistorySection";
import PanelError from "./PanelError";
import ProgressOverlay from "./ProgressOverlay";
import RecordDatePicker from "./RecordDatePicker";
import SectionTitle from "./SectionTitle";
import SuccessSnackbar from "./SuccessSnackbar";
import useFhirRecordHistory from "../hooks/useFhirRecordHistory";
import { getHistoryPanelStyles } from "../styles/historyPanelStyles";
import { DATE_FORMAT } from "../constants/consts.js";
import {
  hasDuplicateEntry,
  isValidPastOrTodayDate,
  getShortDateFromISODateString,
  isAdult,
  padDateString,
  toDateString
} from "../helpers/utility";
import { useSettingContext } from "../context/AppContextProvider";

const LOINC_SYSTEM_URL = "https://loinc.org";
const CONTRACT_CODE = "94136-9";
const AGREEMENT_PDF_URL = "/static/app/files/UW_CST_Agreement.pdf";

const filterAgreementEntry = (entry) =>
  entry.resource?.type?.coding?.[0]?.code === CONTRACT_CODE;
const getAgreementDate = (resource) => resource.date;

export default function Agreement({ rowData }) {
  const theme = useTheme();
  const classes = {
    ...getHistoryPanelStyles(theme),
    addContainer: {
      position: "relative",
      marginBottom: theme.spacing(1.5),
      padding: theme.spacing(2),
    },
    buttonsContainer: {
      marginTop: theme.spacing(2),
      position: "relative",
    },
    panelContainer: {
      position: "relative",
      marginBottom: theme.spacing(2),
      padding: theme.spacing(2),
      minHeight: theme.spacing(9),
    },
  };

  const { appSettings } = useSettingContext();
  const enableAddNew = !!(appSettings && appSettings["ENABLE_ADD_NEW_CS"]);
  const patientId = rowData ? rowData.id : "";

  const history = useFhirRecordHistory({
    resourceType: "DocumentReference",
    patientId,
    searchParams: "_sort=-date",
    filterEntry: filterAgreementEntry,
    getDate: getAgreementDate,
    toRow: (resource, index) => ({
      id: resource.id,
      date: getShortDateFromISODateString(resource.date),
      index,
      patientId,
      system: LOINC_SYSTEM_URL,
      code: CONTRACT_CODE,
    }),
  });
  const { rows, initialized, loading, saving, snackOpen, expanded, error } =
    history;

  const mostRecent = rows.length ? rows[0] : null;

  // "Add New" form: raw picker value (dayjs | null) + the picker's error message.
  const [dateValue, setDateValue] = React.useState(null);
  const [dateError, setDateError] = React.useState("");
  // Edit mode for the latest entry: null when not editing, else the edited date string.
  const [editDate, setEditDate] = React.useState(null);
  const editMode = editDate !== null;
  const [isPrinting, setIsPrinting] = React.useState(false);

  // Leave edit mode whenever history reloads (the original HISTORY_LOADED did this).
  React.useEffect(() => {
    //eslint-disable-next-line react-hooks/set-state-in-effect
    setEditDate(null);
  }, [rows]);

  const newDate = toDateString(dateValue, dateError);
  const canAdd = !!newDate && !saving;
  const canClear = !!dateValue || !!dateError;
  const canSaveEdit = isValidPastOrTodayDate(editDate);

  const submitDataFormatter = (params) => {
    params = params || {};
    return {
      id: params.id || "",
      type: {
        coding: [
          {
            system: params.system ? params.system : LOINC_SYSTEM_URL,
            code: params.code ? params.code : CONTRACT_CODE,
            display: "Controlled substance agreement",
          },
        ],
      },
      subject: {
        reference:
          "Patient/" + (params.patientId ? params.patientId : patientId),
      },
      resourceType: "DocumentReference",
      date: padDateString(params.date || newDate),
    };
  };

  /**
   * Validate, run the duplicate guard, and save.
   */
  const submit = ({ method = "POST", id, date, mode = "update" }) => {
    if (method !== "DELETE") {
      if (!date) {
        history.setError("No contract date provided.");
        return Promise.resolve({ ok: false });
      }
      if (
        hasDuplicateEntry(rows, {
          excludeId: id,
          isMatch: (row) => row.date === date,
        })
      ) {
        history.setError(
          `A controlled substance agreement signed on ${date} is already recorded.`,
        );
        return Promise.resolve({ ok: false });
      }
    }
    return history.save({
      method,
      id,
      mode,
      resource: submitDataFormatter({ id, date }),
    });
  };

  const clearFields = () => {
    setDateValue(null);
    setDateError("");
    history.setError("");
  };

  const handleAdd = async () => {
    if (!canAdd) return;
    const result = await submit({ method: "POST", date: newDate, mode: "add" });
    if (result.ok) clearFields();
  };

  const handleKeyDownAdd = (event) => {
    if (String(event.key).toLowerCase() === "enter") handleAdd();
  };

  const handleEditSave = () => {
    if (!mostRecent || !canSaveEdit) return;
    submit({ method: "PUT", id: mostRecent.id, date: editDate });
  };

  const handleDelete = () => {
    if (!mostRecent) return;
    submit({ method: "DELETE", id: mostRecent.id, date: mostRecent.date });
  };

  const enableEditMode = () => {
    if (!mostRecent) return;
    setEditDate(mostRecent.date);
    history.setError("");
  };

  const disableEditMode = () => {
    setEditDate(null);
    history.setError("");
  };

  const handlePrintNew = async () => {
    if (isPrinting) return; // prevent double-taps
    const printWindow = window.open(AGREEMENT_PDF_URL, "_blank");
    if (!printWindow) {
      alert("Please allow popups to view the agreement.");
      return;
    }
    const today = dayjs().format(DATE_FORMAT);
    if (rows.some((row) => row.date === today)) return;
    setIsPrinting(true);
    // "print" mode: no full-panel overlay (the button shows progress)
    await submit({ method: "POST", date: today, mode: "print" });
    setIsPrinting(false);
  };

  const columns = [
    { field: "id", hidden: true },
    {
      title: "Agreement Date",
      field: "date",
      emptyValue: "--",
      cellStyle: { padding: "4px 24px 4px 16px" },
      editComponent: (params) => (
        <FormattedInput
          defaultValue={params.value}
          handleChange={(e) => params.onChange(e.target.value)}
        />
      ),
    },
  ];

  const renderAddComponent = () => (
    <Paper sx={classes.addContainer} elevation={1}>
      <div>
        <SectionTitle sx={{ marginBottom: 2 }}>Add New</SectionTitle>
      </div>
      <RecordDatePicker
        label="Agreement Date"
        value={dateValue}
        onChange={setDateValue}
        error={dateError}
        onErrorChange={setDateError}
        onKeyDown={handleKeyDownAdd}
      />
      <div style={classes.buttonsContainer}>
        <Button
          variant="contained"
          color="primary"
          sx={classes.addButton}
          disabled={!canAdd}
          onClick={handleAdd}
        >
          Add
        </Button>
        <Button variant="outlined" onClick={clearFields} disabled={!canClear}>
          Clear
        </Button>
      </div>
    </Paper>
  );

  const renderPrintNewComponent = () => (
    <Paper sx={classes.addContainer} elevation={1}>
      <div>
        <SectionTitle sx={{ marginBottom: 1.5 }}>New Agreement</SectionTitle>
      </div>
      <Stack sx={{ flexDirection: "column", gap: 1 }}>
        <div>
          <Button
            variant="outlined"
            onClick={handlePrintNew}
            disabled={isPrinting}
            endIcon={
              isPrinting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <PrintIcon size="small" />
              )
            }
          >
            {isPrinting ? "Processing..." : "Print Agreement Form"}
          </Button>
        </div>
        <Typography variant="caption">
          <strong>Note</strong>: Clicking &ldquo;Print Agreement Form&rdquo;
          records the agreement date.
        </Typography>
      </Stack>
    </Paper>
  );

  const renderEditMostRecent = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span>Signed on</span>
      <FormattedInput
        defaultValue={mostRecent?.date}
        helperText="(YYYY-MM-DD)"
        inputClass={{ input: classes.editInput }}
        handleChange={(e) => setEditDate(e.target.value)}
        handleKeyDown={() => handleEditSave()}
        error={!!error}
      />
    </div>
  );

  const renderMostRecentHistory = () => (
    <React.Fragment>
      <div>
        <SectionTitle>Latest Controlled Substance Agreement</SectionTitle>
      </div>
      {!mostRecent && (
        <div>No previously recorded controlled substance agreement</div>
      )}
      {mostRecent && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* JSX instead of sanitized innerHTML; renders the same markup. */}
            {!editMode && (
              <span>
                Signed on <b>{mostRecent.date}</b>
              </span>
            )}
            {editMode && renderEditMostRecent()}
            <EditButtonGroup
              onEnableEditMode={enableEditMode}
              onDisableEditMode={disableEditMode}
              isUpdateDisabled={!canSaveEdit}
              handleEditSave={handleEditSave}
              handleDelete={handleDelete}
              entryDescription={`Controlled substance agreement signed on <b>${mostRecent.date}</b>`}
            />
          </div>
          {isAdult(rowData.birth_date) && (
            <OverdueAlert
              date={mostRecent.date}
              type="controlled substance agreement"
              overdueMessage="It has been more than 12 months since the patient has signed a controlled substance agreement."
            />
          )}
        </div>
      )}
    </React.Fragment>
  );

  return (
    <div style={classes.container}>
      <div style={classes.contentContainer}>
        <h3>{`Controlled Substance Agreement for ${rowData.first_name} ${rowData.last_name}`}</h3>
        {saving === "add" && <ProgressOverlay />}
        {enableAddNew ? renderAddComponent() : renderPrintNewComponent()}
        <Paper sx={classes.panelContainer} elevation={1}>
          {(!initialized || loading || saving === "update") && (
            <ProgressOverlay />
          )}
          {initialized && renderMostRecentHistory()}
        </Paper>
        {rows.length > 0 && (
          <HistorySection
            count={rows.length}
            expanded={expanded}
            onToggle={history.toggleExpanded}
            data={rows}
            columns={columns}
            apiUrl="/fhir/DocumentReference/"
            submitDataFormatter={submitDataFormatter}
            onRowChange={history.refresh}
            actionsCellWidth="80%"
            elevation={1}
            sx={classes.panelContainer}
          />
        )}
        <SuccessSnackbar open={snackOpen} onClose={history.closeSnack} />
        <PanelError message={error} />
      </div>
    </div>
  );
}

Agreement.propTypes = {
  rowData: PropTypes.object.isRequired,
};
