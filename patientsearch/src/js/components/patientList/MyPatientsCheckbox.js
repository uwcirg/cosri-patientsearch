import { memo, useCallback, useEffect, useRef, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import PropTypes from "prop-types";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import ErrorIcon from "@mui/icons-material/ReportProblemOutlined";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import * as constants from "../../constants/consts";
import { useSettingContext } from "../../context/SettingContextProvider";
import { useUserContext } from "../../context/UserContextProvider";
import { useAppContext } from "../../context/PatientListContextProvider";
import { usePatientListStore } from "../../stores/patientListStore";
import { hasFlagForCheckbox } from "../../helpers/utility";

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

const CheckboxForm = memo(function CheckboxForm({
  checked,
  disable,
  changeEvent,
  checkboxClasses,
  formControlClasses,
  label,
  errorMessage,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <FormControlLabel
        classes={{
          root: formControlClasses.root,
        }}
        control={
          <Checkbox
            checked={checked}
            onChange={changeEvent}
            name="ckMyPatients"
            color="primary"
            size="small"
            disabled={disable}
            classes={{
              root: checkboxClasses.root,
            }}
          />
        }
        label={<Typography variant="body2">{label}</Typography>}
      />
      {errorMessage && (
        <Tooltip
          title={errorMessage}
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
});

CheckboxForm.propTypes = {
  checked: PropTypes.bool,
  disable: PropTypes.bool,
  changeEvent: PropTypes.func,
  checkboxClasses: PropTypes.object,
  formControlClasses: PropTypes.object,
  label: PropTypes.string,
  errorMessage: PropTypes.string,
};

const { resetPagination, setCareTeamPatientIds } =
    usePatientListStore.getState();

export default function MyPatientsCheckbox({ shouldDisable, changeEvent }) {
  const { getAppSettingByKey = () => null } = useSettingContext();
  const { user, userError } = useUserContext();
  const { tableRef } = useAppContext();
  const cloneTableRef = useRef(null);
  const enableProviderFilter = getAppSettingByKey("ENABLE_PROVIDER_FILTER");
  const myPatientsFilterLabel = getAppSettingByKey("MY_PATIENTS_FILTER_LABEL");
  const checkboxClasses = checkBoxStyles();
  const formControlClasses = formControlStyles();
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
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <CheckboxForm
        checked={state}
        disable={shouldDisable}
        changeEvent={handleChange}
        checkboxClasses={checkboxClasses}
        formControlClasses={formControlClasses}
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
