import makeStyles from "@mui/styles/makeStyles";
import PropTypes from "prop-types";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
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
  const { childrenProps } = usePatientListContext();
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const {onTestPatientsCheckboxChange} = childrenProps["testPatient"];
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
      label={<Typography variant="body2">{label}</Typography>}
    />
  );
}

TestPatientsCheckbox.propTypes = {
  label: PropTypes.string,
  changeEvent: PropTypes.func,
};
