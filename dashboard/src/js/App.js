import React, { Component } from "react";
import CssBaseline from '@material-ui/core/CssBaseline';
import Header from "./components/Header";
import Table from "./components/Table";
import Footer from "./components/Footer";
import TimeoutModal from "./components/TimeoutModal";
import "../less/index.less";

export default class App extends React.Component {
  render () {
    return (
      <React.Fragment>
        <CssBaseline />
        <div className="landing">
            <Header />
            <Table />
            <Footer />
            <TimeoutModal />
        </div>
      </React.Fragment>
    );
  }
}
