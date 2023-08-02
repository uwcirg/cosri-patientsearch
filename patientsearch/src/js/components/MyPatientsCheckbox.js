import { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import ErrorIcon from '@material-ui/icons/ReportProblemOutlined';
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";

const checkBoxStyles = makeStyles((theme) => {
  return {
    root: {
      color: theme.palette.primary.main,
    },
    warningBg: {
      backgroundColor: theme.palette.warning.dark,
      color: "#FFF",
      fontSize: "0.95rem"
    },
    warning: {
      color: theme.palette.warning.dark
    }
  };
});
const formControlStyles = makeStyles((theme) => {
  return {
    root: {
      backgroundColor: "#f7f7f7",
      marginLeft: theme.spacing(1),
      marginRight: theme.spacing(1)
    },
  };
});

export default function MyPatientsCheckbox({ label, shouldDisable, shouldCheck, changeEvent, error }) {
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const [state, setState] = useState(shouldCheck);
  const handleChange = (event) => {
    setState(event.target.checked);
    if (changeEvent) changeEvent(event.target.checked);
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
      {error && (
        <Tooltip
          title={error}
          enterTouchDelay={0}
          classes={{
            tooltip: checkboxClasses.warningBg,
          }}
        >
          <ErrorIcon classes={{
            root: checkboxClasses.warning
          }} />
        </Tooltip>
      )}
    </div>
  );
}

MyPatientsCheckbox.propTypes = {
  label: PropTypes.string.isRequired,
  shouldCheck: PropTypes.bool,
  shouldDisable: PropTypes.bool,
  changeEvent: PropTypes.func,
  error: PropTypes.string
};
