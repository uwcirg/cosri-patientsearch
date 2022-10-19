import PropTypes from "prop-types";
import React from "react";
import Header from "../components/Header";
import SystemBanner from "../components/SystemBanner";
import ProjectThemeProvider from "../context/ProjectThemeProvider";
import SettingContextProvider from "../context/SettingContextProvider";
import "../../styles/app.scss";

export default function Layout({children}) {
  return (
    <SettingContextProvider>
      <React.Fragment>
        <ProjectThemeProvider>
          <SystemBanner />
          <Header />
          {children}
        </ProjectThemeProvider>
      </React.Fragment>
    </SettingContextProvider>
  );
}
Layout.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
