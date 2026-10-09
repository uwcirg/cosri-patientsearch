import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import Alert from "./Alert";
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
import {
  hasDuplicateEntry,
  isValidPastOrTodayDate,
  toDateString,
  getShortDateFromISODateString,
  isAdult,
  isEmptyArray,
  padDateString,
} from "../helpers/utility";
import {
  EHR_SYSTEM_URLS,
  UWMC_LAB_ORDER_SYSTEM_URL,
} from "../constants/consts.js";
import {
  useSettingContext,
  useUserContext,
} from "../context/AppContextProvider";

const URINE_SCREEN_TYPE_LABEL = "Urine Drug Screen Name";
const getServiceRequestDate = (resource) => resource.authoredOn;
const hasEhrIdentifier = (identifiers) =>
  !isEmptyArray(identifiers) &&
  identifiers.some((item) => EHR_SYSTEM_URLS.indexOf(item.system) !== -1);
const hasUwLabIdentifier = (identifiers) =>
  !isEmptyArray(identifiers) &&
  identifiers.some((item) => item.system === UWMC_LAB_ORDER_SYSTEM_URL);

export default function UrineScreen({ rowData }) {
  const { user } = useUserContext();
  const { appSettings } = useSettingContext();
  const theme = useTheme();
  const classes = {
    ...getHistoryPanelStyles(theme),
    itemContainer: {
      position: "relative",
      marginBottom: theme.spacing(1),
      padding: theme.spacing(1, 2, 1),
    },
    textDisplay: {
      marginTop: theme.spacing(3),
    },
    buttonsContainer: {
      marginTop: theme.spacing(1.5),
      marginBottom: theme.spacing(1), // was misspelled `marginBottm` (never applied)
      position: "relative",
    },
    recentEntryContainer: {
      position: "relative",
      marginBottom: theme.spacing(1),
      padding: theme.spacing(1, 2, 0.5),
      // Gives the overlay room before the first load renders any content.
      minHeight: theme.spacing(6),
    },
    selectFormControl: {
      marginBottom: theme.spacing(1),
    },
    selectBox: {
      minWidth: "248px",
      fontSize: "14px",
      marginRight: theme.spacing(0.5),
    },
    readonlyLabel: {
      fontSize: "12px",
      marginBottom: theme.spacing(0.5),
    },
    editInput: {
      width: theme.spacing(10),
      border: 0,
      textAlign: "center",
    },
    overDueContainer: {
      marginBottom: theme.spacing(2),
    },
  };

  /* ---------------- configured lab types ---------------- */

  const configTypes =
    appSettings && appSettings["UDS_LAB_TYPES"]
      ? appSettings["UDS_LAB_TYPES"]
      : null;
  const editableTypes = React.useMemo(
    () =>
      configTypes
        ? configTypes.filter((item) => !hasEhrIdentifier(item.identifier))
        : [],
    [configTypes],
  );
  const onlyOneType = editableTypes.length === 1;
  const noEditableTypes = editableTypes.length === 0;
  const findType = (code) => editableTypes.find((item) => item.code === code);

  // What the history filter matches on
  const { availableCodes, systemIdentifiers } = React.useMemo(() => {
    const types = configTypes || [];
    return {
      availableCodes: types.map((item) => item.code),
      systemIdentifiers: types
        .filter((item) => !isEmptyArray(item.identifier))
        .flatMap((item) => item.identifier.map((id) => id.system)),
    };
  }, [configTypes]);

  /* ---------------- history ---------------- */

  const patientId = rowData ? rowData.id : null;

  const history = useFhirRecordHistory({
    resourceType: "ServiceRequest",
    patientId,
    // Re-fetch when the type config arrives/changes; the filter depends on it
    refreshKey: configTypes,
    refreshDelay: 250,
    getDate: getServiceRequestDate,
    filterEntry: (entry) => {
      const resource = entry.resource;
      if (!resource.code || isEmptyArray(resource.code.coding)) return false;
      if (!isEmptyArray(resource.identifier)) {
        return resource.identifier.some(
          (item) => systemIdentifiers.indexOf(item.system) !== -1,
        );
      }
      return availableCodes.indexOf(resource.code.coding[0].code) !== -1;
    },
    toRow: (resource, index) => {
      const coding = resource.code && resource.code.coding;
      const text =
        resource.code && resource.code.text
          ? resource.code.text
          : !isEmptyArray(coding)
            ? coding[0].display
            : "";
      const code = !isEmptyArray(coding) ? coding[0].code : "";
      const readonly = hasEhrIdentifier(resource.identifier);
      const requester =
        resource.requester && resource.requester.display
          ? resource.requester.display
          : null;
      const readonlyOrderLabel = hasUwLabIdentifier(resource.identifier)
        ? "UW lab order"
        : "EHR";
      return {
        id: resource.id,
        index,
        type: code ? code : text,
        text,
        date: getShortDateFromISODateString(resource.authoredOn),
        patientId,
        readonly,
        requester,
        // Cosmetic fix: the original produced a double space ("EHR  (placed by X)").
        source: readonly
          ? `${readonlyOrderLabel}${requester ? ` (placed by ${requester})` : ""}`
          : requester
            ? `manually entered (placed by ${requester})`
            : "manually entered",
      };
    },
    deriveMeta: (entries) => {
      const isEHR = entries.some((o) => !isEmptyArray(o.resource.identifier));
      const isDawg =
        isEHR && entries.some((o) => hasUwLabIdentifier(o.resource.identifier));
      return {
        orderInfoMessage: isEHR
          ? `Display of ${isDawg ? "UW" : "EHR"} lab orders may be delayed by 24-48 hours.`
          : "",
      };
    },
  });
  const {
    rows,
    meta,
    initialized,
    loading,
    saving,
    snackOpen,
    expanded,
    error,
  } = history;
  
  const mostRecent = !isEmptyArray(rows) ? rows[0] : null;

  /* ---------------- add form state ---------------- */

  const [type, setType] = React.useState("");
  const selectedType = onlyOneType ? editableTypes[0].code : type;
  const [dateValue, setDateValue] = React.useState(null);
  const [dateError, setDateError] = React.useState("");

  /* ---------------- edit state (latest entry) ---------------- */

  // null when not editing, else { date, type }
  const [editEntry, setEditEntry] = React.useState(null);
  const editMode = editEntry !== null;

  // Leave edit mode whenever history reloads (original init-complete/edit reset).
  React.useEffect(() => {
    //eslint-disable-next-line react-hooks/set-state-in-effect
    setEditEntry(null);
  }, [rows]);

  const newDate = toDateString(dateValue, dateError);
  const canAdd = !!selectedType && !!newDate && !saving;
  const canClear = !!dateValue || !!dateError || (!onlyOneType && !!type);
  const canSaveEdit =
    editMode &&
    (onlyOneType || !!editEntry.type) &&
    isValidPastOrTodayDate(editEntry.date);

  /**
   * Build the ServiceRequest resource (also used by HistoryTable row edits).
   */
  const submitDataFormatter = (params) => {
    params = params || {};
    const testType = params.type ? params.type : selectedType;
    const testDate = params.date ? params.date : newDate;
    const match = findType(testType);
    const resource = {
      authoredOn: padDateString(testDate),
      code: {
        coding: [
          {
            code: testType,
            display: match ? match.display : params.text,
            system: match ? match.system : undefined,
          },
        ],
        text: match ? match.text : params.text,
      },
      requester: user ? { display: user.name ?? user.username } : null,
      resourceType: "ServiceRequest",
      subject: {
        reference:
          "Patient/" + (params.patientId ? params.patientId : patientId),
      },
    };
    // include id if present, necessary for PUT request
    if (params.id) resource.id = params.id;
    return resource;
  };

  /**
   * Validate, run the duplicate guard, and save.
   *
   * ASSUMPTION: a urine screen duplicate is same date AND same screen type, so
   * two different screen types ordered the same day are still allowed. Change
   * isMatch to `row.date === date` for date-only (like Agreement).
   */
  const submit = ({
    method = "POST",
    id,
    date,
    type: testType,
    text,
    mode = "update",
  }) => {
    if (method !== "DELETE") {
      const match = findType(testType);
      if (!testType || !match) {
        history.setError("Unknown urine screen type " + testType);
        return Promise.resolve({ ok: false });
      }
      if (!date) {
        history.setError("Missing urine screen date");
        return Promise.resolve({ ok: false });
      }
      if (
        hasDuplicateEntry(rows, {
          excludeId: id,
          isMatch: (row) => row.date === date && row.type === testType,
        })
      ) {
        history.setError(
          `A ${match.text} placed on ${date} is already recorded.`,
        );
        return Promise.resolve({ ok: false });
      }
    }
    return history.save({
      method,
      id,
      mode,
      resource: submitDataFormatter({ id, date, type: testType, text }),
    });
  };

  const clearFields = () => {
    setDateValue(null);
    setDateError("");
    if (!onlyOneType) setType("");
    history.setError("");
  };

  const handleAdd = async () => {
    if (!canAdd) return;
    const result = await submit({
      method: "POST",
      date: newDate,
      type: selectedType,
      mode: "add",
    });
    if (result.ok) clearFields();
  };

  const handleEditSave = () => {
    if (!mostRecent || !canSaveEdit) return;
    submit({
      method: "PUT",
      id: mostRecent.id,
      date: editEntry.date,
      type: onlyOneType ? mostRecent.type : editEntry.type,
      text: mostRecent.text,
    });
  };

  const handleDelete = () => {
    if (!mostRecent) return;
    submit({
      method: "DELETE",
      id: mostRecent.id,
      date: editEntry && editEntry.date ? editEntry.date : mostRecent.date,
      type: editEntry && editEntry.type ? editEntry.type : mostRecent.type,
      text: mostRecent.text,
    });
  };

  const enableEditMode = () => {
    if (!mostRecent) return;
    setEditEntry({ date: mostRecent.date, type: mostRecent.type });
    history.setError("");
  };

  const disableEditMode = () => {
    setEditEntry(null);
    history.setError("");
  };

  /* ---------------- rendering ---------------- */

  const renderTypeOptions = () =>
    editableTypes.map((item, index) => (
      <MenuItem value={item.code} key={`${item.code}_${index}`}>
        <Typography variant="body2">{item.text}</Typography>
      </MenuItem>
    ));

  const getSelectLookupTypes = () => {
    if (noEditableTypes) return undefined;
    const types = {};
    editableTypes.forEach((item) => {
      types[item.code] = item.text;
    });
    return types;
  };

  const columns = [
    { field: "id", hidden: true },
    {
      title: URINE_SCREEN_TYPE_LABEL,
      field: "type",
      emptyValue: "--",
      cellStyle: { padding: "4px 24px 4px 16px" },
      lookup: !onlyOneType ? getSelectLookupTypes() : null,
      editable: !onlyOneType ? "always" : "never",
      render: (row) => <span>{row.text}</span>,
    },
    {
      title: "Order Date",
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
    { title: "Source", field: "source", editable: false },
  ];

  const renderTypeSelector = () => (
    <Box sx={{ position: "relative" }}>
      {onlyOneType && (
        <Box sx={classes.textDisplay}>
          <InputLabel sx={classes.readonlyLabel}>
            {URINE_SCREEN_TYPE_LABEL}
          </InputLabel>
          <Typography variant="subtitle2">{editableTypes[0].text}</Typography>
        </Box>
      )}
      {!onlyOneType && !noEditableTypes && (
        <FormControl sx={classes.selectFormControl} variant="standard">
          <InputLabel>{URINE_SCREEN_TYPE_LABEL}</InputLabel>
          <Select
            value={type}
            onChange={(event) => setType(event.target.value)}
            sx={classes.selectBox}
            IconComponent={() => <ArrowDropDownIcon color="primary" />}
          >
            {renderTypeOptions()}
          </Select>
        </FormControl>
      )}
      {noEditableTypes && (
        <PanelError message="No urine drug screen type list is loaded." />
      )}
    </Box>
  );

  const renderAddComponent = () => (
    <Paper sx={classes.itemContainer} elevation={1}>
      <div>
        <SectionTitle>Add New</SectionTitle>
      </div>
      <div>
        <RecordDatePicker
          label="Order Date"
          value={dateValue}
          onChange={setDateValue}
          error={dateError}
          onErrorChange={setDateError}
        />
      </div>
      {renderTypeSelector()}
      {!noEditableTypes && (
        <Box sx={classes.buttonsContainer}>
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
        </Box>
      )}
    </Paper>
  );

  // Plain-text description used by EditButtonGroup (it expects an HTML string).
  const mostRecentDescription = () => {
    if (!mostRecent) return "";
    if (mostRecent.text) {
      const source = mostRecent.source ? ", " + mostRecent.source : "";
      return `${mostRecent.text} on <b>${mostRecent?.date}</b> ${source}`;
    }
    return `Placed on <b>${mostRecent && mostRecent?.date ? mostRecent.date : ""}</b>`;
  };

  // JSX equivalent of the above for display (replaces sanitized innerHTML).
  const renderMostRecentText = () => {
    if (!mostRecent) return "";
    return mostRecent?.text ? (
      <span>
        {mostRecent?.text} on <b>{mostRecent?.date}</b>
        {mostRecent?.source ? `, ${mostRecent?.source}` : ""}
      </span>
    ) : (
      <span>
        Placed on <b>{mostRecent?.date}</b>
      </span>
    );
  };

  const renderEditMostRecent = () => (
    <React.Fragment>
      {onlyOneType || (mostRecent && mostRecent.readonly)
        ? mostRecent
          ? mostRecent.text || ""
          : ""
        : mostRecent && (
            <FormControl>
              <Select
                defaultValue={mostRecent.type}
                onChange={(event) =>
                  setEditEntry((prev) => ({
                    ...prev,
                    type: event.target.value,
                  }))
                }
                sx={classes.selectBox}
                IconComponent={() => <ArrowDropDownIcon color="primary" />}
                error={!!error}
                variant="standard"
              >
                {renderTypeOptions()}
              </Select>
              <FormHelperText>{`(${URINE_SCREEN_TYPE_LABEL})`}</FormHelperText>
            </FormControl>
          )}
      <span> placed on </span>
      <div style={{ display: "inline-block" }}>
        <FormattedInput
          defaultValue={mostRecent?.date}
          helperText="(YYYY-MM-DD)"
          disableFocus={!onlyOneType}
          handleChange={(e) =>
            setEditEntry((prev) => ({ ...prev, date: e.target.value }))
          }
          handleKeyDown={() => handleEditSave()}
          inputClass={{ input: classes.editInput }}
          error={!!error}
          readOnly={mostRecent.readonly}
        />
      </div>
    </React.Fragment>
  );

  const renderNoData = () => {
    const isUwmc =
      appSettings && String(appSettings["SITE_ID"]).toLowerCase() === "uwmc";
    const message = isUwmc
      ? "No urine drug screen date found for this patient. Please check the last controlled substance prescription and Epic labs to determine if they are due for their 12 month drug screen."
      : "No urine drug screen date found for this patient. Please check the last controlled substance prescription to determine if they are due for their 12 month drug screen.";
    return (
      <Alert
        message={message}
        severity="warning"
        variant="standard"
        elevation={0}
        sx={{ marginBottom: (t) => t.spacing(1) }}
      />
    );
  };

  const renderMostRecentHistory = () => (
    <Paper sx={classes.recentEntryContainer} elevation={0}>
      {(!initialized || loading || saving === "update") && <ProgressOverlay />}
      {initialized && (
        <React.Fragment>
          <div>
            <SectionTitle>Last Urine Drug Screen</SectionTitle>
          </div>
          {!mostRecent && (
            <div style={{ marginTop: "8px", marginBottom: "8px" }}>
              {renderNoData()}
            </div>
          )}
          {mostRecent && (
            <React.Fragment>
              <div className="flex-gap-1">
                {!editMode && renderMostRecentText()}
                {editMode && renderEditMostRecent()}
                {!mostRecent.readonly && (
                  <EditButtonGroup
                    onEnableEditMode={enableEditMode}
                    onDisableEditMode={disableEditMode}
                    isUpdateDisabled={!canSaveEdit}
                    handleEditSave={handleEditSave}
                    handleDelete={handleDelete}
                    entryDescription={mostRecentDescription()}
                  />
                )}
              </div>
              {isAdult(rowData.birth_date) && (
                <Box sx={classes.overDueContainer}>
                  <OverdueAlert
                    date={mostRecent?.date}
                    type="urine drug screen"
                  />
                </Box>
              )}
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    </Paper>
  );

  return (
    <Box sx={classes.container}>
      <h3>{`Urine Drug Toxicology Screen for ${rowData.first_name} ${rowData.last_name}`}</h3>
      <Box sx={classes.contentContainer}>
        {saving === "add" && <ProgressOverlay />}
        {renderAddComponent()}
        {meta.orderInfoMessage && (
          <Alert
            message={meta.orderInfoMessage}
            severity="warning"
            variant="standard"
            elevation={0}
            sx={{ marginBottom: (t) => t.spacing(1) }}
          />
        )}
        {renderMostRecentHistory()}
        {rows.length > 0 && (
          <HistorySection
            count={rows.length}
            expanded={expanded}
            onToggle={history.toggleExpanded}
            data={rows}
            columns={columns}
            apiUrl="/fhir/ServiceRequest/"
            submitDataFormatter={submitDataFormatter}
            onRowChange={history.refresh}
            actionsCellWidth="60%"
            elevation={0}
            sx={classes.itemContainer}
          />
        )}
        <SuccessSnackbar open={snackOpen} onClose={history.closeSnack} />
        <PanelError message={error} />
      </Box>
    </Box>
  );
}

UrineScreen.propTypes = {
  rowData: PropTypes.object.isRequired,
};
