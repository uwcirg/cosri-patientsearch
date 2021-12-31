import "core-js/stable";
import "regenerator-runtime/runtime";
import React, { Component } from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/styles";
import Header from "./components/Header";
import PatientListTable from "./components/PatientListTable";
import TimeoutModal from "./components/TimeoutModal.js";
import SystemBanner from "./components/SystemBanner";
import Version from "./components/Version";
import theme from "./context/theme";
import "../styles/app.scss";

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    //force rendering of fallback UI after an error has been thrown by app
    return { hasError: true };
  }

  render () {
    if (this.state.hasError) {
      return <div className="app-error-container">
        <h1>Application Error  - Something went wrong.</h1>
        <h2 className="error">See console for detail</h2>
        <div className="buttons-container"><a href="/">Refresh</a></div>
      </div>;
    }
    return (
      <React.Fragment>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SystemBanner />
          <Header />
          <PatientListTable />
          <TimeoutModal />
          <Version />
        </ThemeProvider>
      </React.Fragment>
    );
  }
}
