import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import theme from "../context/theme";
import { getAppSettings } from "../context/SettingContextProvider";

const useStyles = makeStyles({
  container: {
    textAlign: "center",
    position: "fixed",
    top: 0,
    width: "100%",
    zIndex: 9999,
    backgroundColor: theme.palette.primary.warningLight,
  },
});

export default function SystemBanner(props) {
  const classes = useStyles();
  const SYSTEM_TYPE_STRING = "SYSTEM_TYPE";
  const appSettings = props.appSettings ? props.appSettings : getAppSettings(); //provide default if none provided
  function getSystemType() {
    if (props.systemType) return props.systemType;
    if (!Object.keys(appSettings)) return "";
    return appSettings[SYSTEM_TYPE_STRING];
  }
  function isNonProduction() {
    let systemType = getSystemType();
    return systemType && String(systemType.toLowerCase()) !== "production";
  }
  React.useEffect(() => {
    //wait for application settings
  }, [appSettings]);
  return (
    /* display system type for non-production instances */
    <div className={classes.container}>
      {isNonProduction() && (
        <span>{getSystemType()} version - not for clinical use</span>
      )}
    </div>
  );
}
SystemBanner.propTypes = {
  systemType: PropTypes.string,
  appSettings: PropTypes.object
};
