import { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";

const checkBoxStyles = makeStyles((theme) => {
  return {
    root: {
      color: theme.palette.primary.main,
    },
  };
});
const formControlStyles = makeStyles((theme) => {
  return {
    root: {
      backgroundColor: "#f7f7f7",
      paddingRight: theme.spacing(1.5),
    },
  };
});

export default function MyPatientsCheckbox({ shouldCheck, changeEvent }) {
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const [state, setState] = useState(shouldCheck);
  const handleChange = (event) => {
    setState(event.target.checked);
    if (changeEvent) changeEvent(event.target.checked);
  };
  return (
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
          classes={{
            root: checkboxClasses.root,
          }}
        />
      }
      label="My Patients"
    />
  );
}

MyPatientsCheckbox.propTypes = {
  shouldCheck: PropTypes.bool,
  changeEvent: PropTypes.func,
};
