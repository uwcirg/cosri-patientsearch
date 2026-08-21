import React, { memo, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import { usePatientListStore } from "../../stores/patientListStore";
import { usePatientDataContext } from "../../context/PatientListContextProvider";
import { useSettingContext } from "../../context/AppContextProvider";

const CheckboxForm = memo(function CheckboxForm({
  label,
  changeEvent,
}) {
  return (
    <FormControlLabel
      className="formControl__container--label"
      control={
        <Checkbox
          onChange={changeEvent}
          name="ckTestPatients"
          size="small"
          color="primary"
          sx={{
            color: "primary.dark"
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
};

const { resetPagination, toggleTestPatients } =
    usePatientListStore.getState();

export default function TestPatientsCheckbox({ changeEvent }) {
  const { getAppSettingByKey = () => null } = useSettingContext();
  const enableFilterByTestPatients = getAppSettingByKey(
    "ENABLE_FILTER_FOR_TEST_PATIENTS",
  );
  const filterByTestPatientsLabel = getAppSettingByKey(
    "FILTER_FOR_TEST_PATIENTS_LABEL",
  );
  const { tableRef } = usePatientDataContext();
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
    ></CheckboxForm>
  );
}

TestPatientsCheckbox.propTypes = {
  label: PropTypes.string,
  changeEvent: PropTypes.func,
};
