import React, { Component } from "react";
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/styles';
import Header from './components/Header';
//import Search from './components/Search';
import PatientListTable from './components/PatientListTable';
import TimeoutModal from './components/TimeoutModal.js';
import theme from './context/theme';
import '../styles/app.scss';

export default class App extends Component {
  render () {
    return (
      <React.Fragment>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Header />

          {/* <Search /> */}
          <PatientListTable />
          <TimeoutModal />
        </ThemeProvider>
      </React.Fragment>
    );
  }
}
