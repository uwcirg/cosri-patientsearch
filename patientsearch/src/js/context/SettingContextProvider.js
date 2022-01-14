import React, { useContext, useState, useEffect, createContext } from "react";
import {getSettings} from "../components/Utility";
const SettingContext = React.createContext();

export default function SettingContextProvider({children}) {
    const [appSettings, setAppSettings] = useState({});
    useEffect(() => {
        getSettings((data) => {
            if (data && !data.error) {
                setAppSettings(data);
            }
        });
    }, []);
    return <SettingContext.Provider value={{appSettings}}>{children}</SettingContext.Provider>
}
export function useSettingContext() {
    const context = useContext(SettingContext);
    if (context === undefined) {
        throw new Error("Context must be used within a Provider");
      }
    return context;
}
