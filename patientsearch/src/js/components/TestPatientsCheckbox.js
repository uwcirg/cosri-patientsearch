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
      marginTop: theme.spacing(1.5),
    },
  };
});

export default function TestPatientsCheckbox({ label, changeEvent }) {
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const handleChange = (event) => {
    if (changeEvent) changeEvent(event.target.checked);
  };
  return (
    <FormControlLabel
      classes={{
        root: formControlClasses.root,
      }}
      control={
        <Checkbox
          onChange={handleChange}
          name="ckTestPatients"
          color="primary"
          size="small"
          classes={{
            root: checkboxClasses.root,
          }}
        />
      }
      label={label}
    />
  );
}

TestPatientsCheckbox.propTypes = {
  label: PropTypes.string.isRequired,
  changeEvent: PropTypes.func,
};
