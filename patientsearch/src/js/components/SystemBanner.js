import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import { useSettingContext } from "../context/SettingContextProvider";

const useStyles = makeStyles((theme) => ({
  container: {
    textAlign: "center",
    position: "fixed",
    top: 0,
    width: "100%",
    zIndex: 9999,
    backgroundColor: theme.palette.primary.warningLight,
  },
}));

export default function SystemBanner(props) {
  const classes = useStyles();
  const SYSTEM_TYPE_STRING = "SYSTEM_TYPE";
  const settingsCtx = useSettingContext();
  const appSettings = props.appSettings
    ? props.appSettings
    : settingsCtx.appSettings; //provide default if none provided
  const getSystemType = () => {
    if (props.systemType) return props.systemType;
    if (!appSettings || !Object.keys(appSettings).length) return null;
    return appSettings[SYSTEM_TYPE_STRING];
  };
  const isNonProduction = () => {
    let systemType = getSystemType();
    return systemType && String(systemType.toLowerCase()) !== "production";
  };
  const isNotProd = isNonProduction();
  if (!isNotProd) return null;
  return (
    /* display system type for non-production instances */
    <div className={classes.container}>
      <span>{getSystemType()} version - not for clinical use</span>
    </div>
  );
}
SystemBanner.propTypes = {
  systemType: PropTypes.string,
  appSettings: PropTypes.object,
};
