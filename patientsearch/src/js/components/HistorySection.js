import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import HistoryTable from "./HistoryTable";
import SectionTitle from "./SectionTitle";

/**
 * "History -  N record(s) - View/Hide" panel with the editable HistoryTable.
 *
 * Expanded state is controlled by the parent (via useFhirRecordHistory) so a
 * successful add/update can collapse it.
 *
 * DEVIATION (accessibility): the originals set aria-label="expand"/"collapse"
 * (UrineScreen misspelled it `arial-label`, so it was never applied). An
 * aria-label overrides the visible "View"/"Hide" text, so screen-reader and
 * voice-control users heard a different name than sighted users saw. The
 * visible text is now the accessible name, with aria-expanded for state.
 *
 * Cosmetic: the header gets marginTop spacing(1) in both panels (Agreement had
 * it; UrineScreen referenced an undefined style key, so it had none).
 */
export default function HistorySection({
  count,
  expanded,
  onToggle,
  data,
  columns,
  apiUrl,
  submitDataFormatter,
  onRowChange,
  actionsCellWidth = "80%",
  elevation = 1,
  sx,
}) {
  return (
    <Paper
      sx={[{ position: "relative" }, ...(Array.isArray(sx) ? sx : [sx])]}
      elevation={elevation}
    >
      <Box sx={{ marginTop: 1 }}>
        <SectionTitle>History</SectionTitle>
        <div>
          <span>
            <b>{count}</b> record(s)
          </span>
          <Button
            aria-expanded={expanded}
            color="primary"
            onClick={onToggle}
            endIcon={
              expanded ? (
                <ExpandLessIcon sx={{ marginLeft: "-4px", position: "relative" }} />
              ) : (
                <ExpandMoreIcon sx={{ marginLeft: "-4px", position: "relative" }} />
              )
            }
            size="small"
            sx={(theme) => ({
              marginLeft: theme.spacing(2),
              verticalAlign: "middle",
              fontSize: "12px",
            })}
          >
            {expanded ? "Hide" : "View"}
          </Button>
        </div>
      </Box>
      {expanded && (
        <Box sx={{ position: "relative" }}>
          <div className="history-table">
            <HistoryTable
              data={data}
              columns={columns}
              APIURL={apiUrl}
              submitDataFormatter={submitDataFormatter}
              onRowUpdate={() => onRowChange()}
              onRowDelete={() => onRowChange()}
              options={{
                actionsCellStyle: { width: actionsCellWidth, textAlign: "left" },
              }}
            />
          </div>
        </Box>
      )}
    </Paper>
  );
}

HistorySection.propTypes = {
  count: PropTypes.number.isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  data: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  apiUrl: PropTypes.string.isRequired, // e.g. "/fhir/ServiceRequest/"
  submitDataFormatter: PropTypes.func.isRequired,
  onRowChange: PropTypes.func.isRequired,
  actionsCellWidth: PropTypes.string,
  elevation: PropTypes.number,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};
