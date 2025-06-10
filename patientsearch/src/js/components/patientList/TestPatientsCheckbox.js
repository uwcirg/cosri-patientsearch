import { memo } from "react";
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

const CheckboxForm = memo(function CheckboxForm({
  label,
  changeEvent,
  checkboxClasses,
  formControlClasses,
}) {
  return (
    <FormControlLabel
      classes={{
        root: formControlClasses.root,
      }}
      control={
        <Checkbox
          onChange={changeEvent}
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
});

CheckboxForm.propTypes = {
  label: PropTypes.string,
  changeEvent: PropTypes.func,
  checkboxClasses: PropTypes.object,
  formControlClasses: PropTypes.object,
};

export default function TestPatientsCheckbox({ changeEvent }) {
  const { childrenProps } = usePatientListContext();
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const {
    enableFilterByTestPatients,
    filterByTestPatientsLabel,
    onTestPatientsCheckboxChange = function () {},
  } = childrenProps["testPatient"] ?? {};

  if (!enableFilterByTestPatients) return null;
  const handleChange = (event) => {
    if (onTestPatientsCheckboxChange) onTestPatientsCheckboxChange(event);
    if (changeEvent) changeEvent(event.target.checked);
  };
  return (
    <CheckboxForm
      label={filterByTestPatientsLabel}
      changeEvent={handleChange}
      checkboxClasses={checkboxClasses}
      formControlClasses={formControlClasses}
    ></CheckboxForm>
  );
}

TestPatientsCheckbox.propTypes = {
  label: PropTypes.string,
  changeEvent: PropTypes.func,
};
