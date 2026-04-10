import { memo, useCallback, useRef, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";
import PropTypes from "prop-types";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import { usePatientListStore } from "../../stores/patientListStore";
import { useAppContext } from "../../context/PatientListContextProvider";
import { useSettingContext } from "../../context/SettingContextProvider";

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

const { resetPagination, toggleTestPatients } =
    usePatientListStore.getState();

export default function TestPatientsCheckbox({ changeEvent }) {
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
  const { getAppSettingByKey = () => null } = useSettingContext();
  const enableFilterByTestPatients = getAppSettingByKey(
    "ENABLE_FILTER_FOR_TEST_PATIENTS",
  );
  const filterByTestPatientsLabel = getAppSettingByKey(
    "FILTER_FOR_TEST_PATIENTS_LABEL",
  );
  const { tableRef } = useAppContext();
  const cloneTableRef = useRef(null);

  const handleChange = useCallback(
    (event) => {
      resetPagination();
      toggleTestPatients(event.target.checked);
      cloneTableRef.current?.onQueryChange();
      if (changeEvent) changeEvent(event.target.checked);
    },
    [changeEvent],
  );

  useEffect(() => {
    if (!tableRef?.current) return;
    if (cloneTableRef.current) return;
    cloneTableRef.current = tableRef.current;
  }, [tableRef]);

  if (!enableFilterByTestPatients) return null;


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
