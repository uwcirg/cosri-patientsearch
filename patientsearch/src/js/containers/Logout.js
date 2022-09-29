import React from "react";
import { render } from "react-dom";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Layout from "../layout/Layout";
import Alert from "../components/Alert";
import { getUrlParameter } from "../components/Utility";
import { useSettingContext } from "../context/SettingContextProvider";
import "../../styles/app.scss";

// Error message, e.g. forbidden error
const AlertMessage = () => {
  const appSettings = useSettingContext().appSettings;
  if (!getUrlParameter("forbidden")) return ""; // look for forbidden message for now, can be others as well
  const message =
    appSettings && appSettings["FORBIDDEN_TEXT"]
      ? appSettings["FORBIDDEN_TEXT"]
      : "";
  if (message)
    return (
      <div className="alert-container">
        <Alert message={message} elevation={0}></Alert>
      </div>
    );
  return "";
};

const getMessage = () => {
  if (getUrlParameter("user_initiated"))
    return "You have been logged out as requested.";
  if (getUrlParameter("timeout"))
    return "Your session has expired. For security purposes, we recommend closing your browser window. You can always log back in.";
  return "You have been logged out.";
};
// logout entry point
render(
  <Layout>
    <div className="logout-container">
      <Typography component="h4" variant="h5" color="inherit" align="center">
        {getMessage()}
      </Typography>
      <AlertMessage></AlertMessage>
      <br />
      <Button
        color="primary"
        href="/home"
        align="center"
        variant="outlined"
        size="large"
      >
        Click here to log in
      </Button>
    </div>
  </Layout>,
  document.getElementById("content")
);
