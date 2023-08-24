import { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import ErrorIcon from "@material-ui/icons/ReportProblemOutlined";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import {usePatientListContext} from "../../context/PatientListContextProvider";
import {
  getPatientIdsByCareTeamParticipant,
} from "../../helpers/utility";

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
  label
}) {
  const {
    setPatientIdsByCareTeamParticipant = function() {},
    user,
    userError,
    tableRef
  } = usePatientListContext();
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const [state, setState] = useState(false);
  const handleChange = (event) => {
    setState(event.target.checked);
    if (!event.target.checked) {
      setPatientIdsByCareTeamParticipant(null);
      if (tableRef.current) tableRef.current.onQueryChange();
      if (changeEvent) changeEvent();
      return;
    }
    // NOTE - retrieving id(s) of patients whose care team the practitioner is part of
    getPatientIdsByCareTeamParticipant(user ? user.practitionerId : null).then(
      (result) => {
        setPatientIdsByCareTeamParticipant(
          result && result.length ? result : [-1]
        );
        if (tableRef.current) tableRef.current.onQueryChange();
        if (changeEvent) changeEvent();
      }
    );
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
        label={
          <Typography variant="body2">
            {label}
          </Typography>
        }
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
  label: PropTypes.string
};
