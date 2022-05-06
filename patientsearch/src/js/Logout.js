import React from "react";
import { render } from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/styles";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Alert from "./components/Alert";
import Header from "./components/Header";
import {getUrlParameter} from "./components/Utility";
import SettingContextProvider from "./context/SettingContextProvider";
import { getAppSettings } from "./context/SettingContextProvider";
import theme from "./context/theme";
import "../styles/app.scss";

// Error message, e.g. forbidden error
const AlertMessage = () => {
    if (!getUrlParameter("forbidden")) return ""; // look for forbidden message for now, can be others as well
    const appSettings = getAppSettings();
    const [message, setMessage] = React.useState("");
    const [ready, setReady] = React.useState(false);
    React.useEffect(() => {
        if (appSettings && appSettings["FORBIDDEN_TEXT"]) {
            setMessage(appSettings["FORBIDDEN_TEXT"]);
            setReady(true);
        }
    }, [appSettings]);
    return <div>{ready && <div className="alert-container"><Alert message={message} elevation={0}></Alert></div>}</div>;
}
const getMessage = () => {
    if (getUrlParameter("user_initiated")) return "You have been logged out as requested.";
    if (getUrlParameter("timeout")) return "Your session has expired. For security purposes, we recommend closing your browser window. You can always log back in.";
    return "You have been logged out.";
}
// logout entry point
render(
    <SettingContextProvider>
        <React.Fragment>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Header />
                <div className="logout-container">
                    <Typography component="h4" variant="h5" color="inherit" align="center">
                        {getMessage()}
                    </Typography>
                    <AlertMessage></AlertMessage>
                    <br/>
                    <Button color="primary" href="/home" align="center" variant="outlined" size="large">Click here to log in</Button>
                </div>
            </ThemeProvider>
        </React.Fragment>
    </SettingContextProvider>,
document.getElementById("content"));
