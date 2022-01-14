import React from "react";
import { render } from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/styles";
import Header from "./components/Header";
import Info from "./components/Info";
import Version from "./components/Version";
import SettingContextProvider from "./context/SettingContextProvider";
import theme from "./context/theme";
import "../styles/app.scss";

// entry point for pre-authenticated access
render(<React.Fragment>
    <SettingContextProvider>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <section className="landing">
                <Header />
                <Info />
                <Version className="version-container" />
            </section>
        </ThemeProvider>
    </SettingContextProvider>
</React.Fragment>,
document.getElementById("content"));
