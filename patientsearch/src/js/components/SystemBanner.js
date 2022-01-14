import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import theme from "../context/theme";
import { useSettingContext } from "../context/SettingContextProvider";

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

export default function SystemBanner() {
  const classes = useStyles();
  const [systemType, setSystemType] = React.useState("");
  const SYSTEM_TYPE_STRING = "SYSTEM_TYPE";
  const {appSettings} = useSettingContext();
  React.useEffect(() => {
      setSystemType(getSystemType());
  }, [appSettings]);
  function getSystemType() {
    if (!Object.keys(appSettings)) return "";
    return appSettings[SYSTEM_TYPE_STRING];
  }
  function isNonProduction() {
    return systemType && String(systemType.toLowerCase()) !== "production";
  }
  return (
    /* display system type for non-production instances */
    <div className={classes.container}>
      {isNonProduction() && (
        <span>{systemType} version - not for clinical use</span>
      )}
    </div>
  );
}
