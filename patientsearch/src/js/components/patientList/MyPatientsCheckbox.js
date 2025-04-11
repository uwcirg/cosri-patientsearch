import { useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import PropTypes from "prop-types";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import ErrorIcon from "@mui/icons-material/ReportProblemOutlined";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { usePatientListContext } from "../../context/PatientListContextProvider";

const checkBoxStyles = makeStyles((theme) => {
  return {
    root: {
      color: theme.palette.primary.main,
    },
    warningBg: {
      backgroundColor: theme.palette.warning.dark,
      color: "#FFF",
      fontSize: "0.95rem",
    },
    warning: {
      color: theme.palette.warning.dark,
    },
  };
});
const formControlStyles = makeStyles((theme) => {
  return {
    root: {
      backgroundColor: "#f7f7f7",
      marginLeft: theme.spacing(1),
      marginRight: theme.spacing(1),
    },
  };
});

export default function MyPatientsCheckbox({
  shouldDisable,
  changeEvent,
  label,
  checked,
}) {
  const { childrenProps = {} } = usePatientListContext();
  const { onMyPatientsCheckboxChange = function() {}, userError } = (childrenProps["myPatients"] ?? {});
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const [state, setState] = useState(checked);
  const handleChange = (event) => {
    setState(event.target.checked);
    onMyPatientsCheckboxChange(event, changeEvent);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <FormControlLabel
        classes={{
          root: formControlClasses.root,
        }}
        control={
          <Checkbox
            checked={state}
            onChange={handleChange}
            name="ckMyPatients"
            color="primary"
            size="small"
            disabled={shouldDisable}
            classes={{
              root: checkboxClasses.root,
            }}
          />
        }
        label={<Typography variant="body2">{label}</Typography>}
      />
      {userError && (
        <Tooltip
          title={userError}
          enterTouchDelay={0}
          classes={{
            tooltip: checkboxClasses.warningBg,
          }}
        >
          <ErrorIcon
            classes={{
              root: checkboxClasses.warning,
            }}
          />
        </Tooltip>
      )}
    </div>
  );
}

MyPatientsCheckbox.propTypes = {
  shouldDisable: PropTypes.bool,
  changeEvent: PropTypes.func,
  label: PropTypes.string,
  checked: PropTypes.bool,
};
