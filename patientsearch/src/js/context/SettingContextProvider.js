import React, { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {getSettings} from "../components/Utility";
const SettingContext = React.createContext();
/*
 * context provider component that allows application settings to be accessible to its children component(s)
 */
export default function SettingContextProvider({children}) {
    const [appSettings, setAppSettings] = useState({});
    useEffect(() => {
        getSettings((data) => {
            if (data && !data.error) {
                setAppSettings(data);
            }
        });
    }, []);
    return <SettingContext.Provider value={{appSettings}}>{children}</SettingContext.Provider>;
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
