import { makeStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Typography from "@material-ui/core/Typography";
import { usePatientListContext } from "../../context/PatientListContextProvider";

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
      marginLeft: theme.spacing(1),
      marginRight: theme.spacing(1),
    },
  };
});

export default function TestPatientsCheckbox({ label, changeEvent }) {
  const { getAppSettingByKey, onTestPatientsCheckboxChange } =
    usePatientListContext();
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const handleChange = (event) => {
    if (onTestPatientsCheckboxChange) onTestPatientsCheckboxChange(event);
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
      label={
        <Typography variant="body2">
          {label}
        </Typography>
      }
    />
  );
}

TestPatientsCheckbox.propTypes = {
  label: PropTypes.string,
  changeEvent: PropTypes.func,
};
