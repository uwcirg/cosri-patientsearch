import PropTypes from "prop-types";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/styles";
import { useSettingContext } from "../context/SettingContextProvider";
import { getTheme } from "../themes/theme_config";

export default function ProjectThemeProvider({children}) {
    const appSettings = useSettingContext().appSettings;
    return (
        <ThemeProvider theme={getTheme(appSettings["PROJECT_NAME"])}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
};

ProjectThemeProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};