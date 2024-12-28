import PropTypes from "prop-types";
import React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import { useSettingContext } from "../context/SettingContextProvider";
import { getTheme } from "../themes/theme_config";

export default function ProjectThemeProvider({children}) {
    const appSettings = useSettingContext().appSettings;
    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={getTheme(appSettings ? appSettings["PROJECT_NAME"] : null)}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </StyledEngineProvider>
    );
}

ProjectThemeProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
