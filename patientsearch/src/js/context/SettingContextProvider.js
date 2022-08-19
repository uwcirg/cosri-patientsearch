import React, { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import {getSettings} from "../components/Utility";
const SettingContext = React.createContext();
/*
 * context provider component that allows application settings to be accessible to its children component(s)
 */
export default function SettingContextProvider({children}) {
    const [appSettings, setAppSettings] = useState(null);
    useEffect(() => {
        getSettings((data) => {
            if (data && !data.error) {
                setAppSettings(data);
            }
        });
    }, []);
    return <SettingContext.Provider
                value={React.useMemo(() => ({appSettings, setAppSettings}), [
                    appSettings,
                    setAppSettings
                ])}>
                <SettingContext.Consumer>{({appSettings}) => {
                    if (appSettings) return children;
                    return (
                      <div style={{ display: "flex", gap: "16px 16px", padding: "24px" }}>
                        <Typography component="h4">
                          Retrieving application settings ...
                        </Typography>
                        <CircularProgress color="primary"></CircularProgress>
                      </div>
                    );
                }}</SettingContext.Consumer>
            </SettingContext.Provider>;
}
SettingContextProvider.propTypes = {
    children: PropTypes.element.isRequired
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

/*
 * helper function to access application setting object
 */
export function getAppSettings() {
    let appSettings = null;
    let appCtx = null;
    try {
        appCtx = useSettingContext();
        appSettings = appCtx ? appCtx.appSettings : null;
    } catch(e) {
        console.log("Error retrieving context ", e);
        return appSettings;
    }
    return appSettings;
}
