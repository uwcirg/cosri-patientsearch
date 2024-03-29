import React, { useContext, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import CircularProgress from "@material-ui/core/CircularProgress";
import { getSettings } from "../helpers/utility";
const SettingContext = React.createContext({});
/*
 * context provider component that allows application settings to be accessible to its children component(s)
 */
export default function SettingContextProvider({ children }) {
  const [appSettings, setAppSettings] = useState(null);
  const hasAppSettings = useCallback(
    () => appSettings && Object.keys(appSettings).length > 0,
    [appSettings]
  );
  const getAppSettingByKey = useCallback(
    (key) => {
      if (!hasAppSettings()) return "";
      return appSettings[key];
    },
    [appSettings, hasAppSettings]
  );
  useEffect(() => {
    getSettings((data) => {
      if (data && !data.error) {
        setAppSettings(data);
      }
    });
  }, []);
  return (
    <SettingContext.Provider
      value={React.useMemo(
        () => ({
          appSettings,
          setAppSettings,
          hasAppSettings,
          getAppSettingByKey,
        }),
        [appSettings, setAppSettings, hasAppSettings, getAppSettingByKey]
      )}
    >
      <SettingContext.Consumer>
        {({ appSettings }) => {
          if (appSettings) return children;
          return (
            <div style={{ display: "flex", gap: "16px 16px", padding: "24px" }}>
              Loading... <CircularProgress color="primary"></CircularProgress>
            </div>
          );
        }}
      </SettingContext.Consumer>
    </SettingContext.Provider>
  );
}
SettingContextProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.element]),
};
/*
 * helper function to access application setting context
 */
export function useSettingContext() {
  const context = useContext(SettingContext);
  if (context === undefined) {
    throw new Error("Context must be used within a Provider");
  }
  return context;
}
