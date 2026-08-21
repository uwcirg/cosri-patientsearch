import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import ErrorIcon from "@mui/icons-material/ReportProblemOutlined";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import * as constants from "../../constants/consts";
import {
  useSettingContext,
  useUserContext,
} from "../../context/AppContextProvider";
import { usePatientDataContext } from "../../context/PatientListContextProvider";
import { usePatientListStore } from "../../stores/patientListStore";
import { hasFlagForCheckbox } from "../../helpers/utility";

const CheckboxForm = memo(function CheckboxForm({
  checked,
  disable,
  changeEvent,
  label,
  errorMessage,
}) {
  return (
    <div className="flex-center flex-gap-1 flex-justify-start">
      <FormControlLabel
        className="formControl__container--label"
        control={
          <Checkbox
            checked={checked}
            onChange={changeEvent}
            name="ckMyPatients"
            size="small"
            disabled={disable}
            color="primary"
            sx={{
              color: "primary.dark",
            }}
          />
        }
        label={<Typography variant="body2">{label}</Typography>}
      />
      {errorMessage && (
        <Tooltip
          title={errorMessage}
          enterTouchDelay={0}
          slotProps={{
            tooltip: {
              className: "tooltip__container--warning",
            },
          }}
        >
          <ErrorIcon color="warning" />
        </Tooltip>
      )}
    </div>
  );
});

CheckboxForm.propTypes = {
  checked: PropTypes.bool,
  disable: PropTypes.bool,
  changeEvent: PropTypes.func,
  label: PropTypes.string,
  errorMessage: PropTypes.string,
};

const { resetPagination, setCareTeamPatientIds } =
    usePatientListStore.getState();

export default function MyPatientsCheckbox({ shouldDisable, changeEvent }) {
  const { getAppSettingByKey = () => null } = useSettingContext();
  const { user, userError } = useUserContext();
  const { tableRef } = usePatientDataContext();
  const cloneTableRef = useRef(null);
  const enableProviderFilter = getAppSettingByKey("ENABLE_PROVIDER_FILTER");
  const myPatientsFilterLabel = getAppSettingByKey("MY_PATIENTS_FILTER_LABEL");
  const [state, setState] = useState(
    hasFlagForCheckbox(constants.FOLLOWING_FLAG),
  );
  const onMyPatientsCheckboxChange = useCallback(
    (event, changeEvent) => {
      resetPagination();
      if (event?.target && !event.target.checked) setCareTeamPatientIds(null);
      else if (user?.followingPatientIds)
        setCareTeamPatientIds(user.followingPatientIds);
      cloneTableRef.current?.onQueryChange();
      if (changeEvent) changeEvent();
    },
    [user],
  );
  const handleChange = useCallback(
    (event) => {
      setState(event.target.checked);
      onMyPatientsCheckboxChange(event, changeEvent);
    },
    [onMyPatientsCheckboxChange, changeEvent],
  );
  

  useEffect(() => {
    if (!tableRef?.current) return;
    if (cloneTableRef.current) return;
    cloneTableRef.current = tableRef.current;
  }, [tableRef]);

  if (!enableProviderFilter) return null;
  return (
    <div className="flex-center flex-gap-1 flex-justify-start">
      <CheckboxForm
        checked={state}
        disable={shouldDisable}
        changeEvent={handleChange}
        label={myPatientsFilterLabel}
        errorMessage={userError}
      ></CheckboxForm>
    </div>
  );
}

MyPatientsCheckbox.propTypes = {
  shouldDisable: PropTypes.bool,
  changeEvent: PropTypes.func,
  label: PropTypes.string,
  checked: PropTypes.bool,
};
