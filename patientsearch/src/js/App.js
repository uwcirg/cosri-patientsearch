import React, { Component } from "react";
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/styles';
import Header from './components/Header';
import PatientListTable from './components/PatientListTable';
import TimeoutModal from './components/TimeoutModal.js';
import SystemBanner from './components/SystemBanner';
import Version from './components/Version';
import theme from './context/theme';
import '../styles/app.scss';

export default class App extends Component {
  render () {
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
