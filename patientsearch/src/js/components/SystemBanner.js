import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import { useSettingContext } from "../context/SettingContextProvider";
import Box from "@mui/material/Button";

export default function SystemBanner(props) {
  const theme = useTheme();
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
    <Box
      sx={{
        textAlign: "center",
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: 9999,
        backgroundColor: theme.palette.primary.warningLight,
        color: "#444",
        padding: 0,
        fontSize: "0.7rem"
      }}
    >
      <span>{getSystemType()} version - not for clinical use</span>
    </Box>
  );
}
SystemBanner.propTypes = {
  systemType: PropTypes.string,
  appSettings: PropTypes.object,
};
