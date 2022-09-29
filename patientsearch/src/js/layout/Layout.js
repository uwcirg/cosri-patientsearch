import PropTypes from "prop-types";
import React from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/styles";
import Header from "../components/Header";
import SystemBanner from "../components/SystemBanner";
import SettingContextProvider from "../context/SettingContextProvider";
import theme from "../themes/theme";
import "../../styles/app.scss";

export default function Layout({children}) {
  return (
    <SettingContextProvider>
      <React.Fragment>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SystemBanner />
          <Header />
          {children}
        </ThemeProvider>
      </React.Fragment>
    </SettingContextProvider>
  );
}
Layout.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
