import PropTypes from "prop-types";
import React from "react";
import Header from "../components/Header";
import SystemBanner from "../components/SystemBanner";
import ProjectThemeProvider from "../context/ProjectThemeProvider";
import AppContextProvider from "../context/AppContextProvider";
import "../../styles/app.scss";

export default function Layout({children}) {
  return (
    <>
      <AppContextProvider>
        <ProjectThemeProvider>
          <SystemBanner />
          <Header />
          {children}
        </ProjectThemeProvider>
      </AppContextProvider>
    </>
  );
}
Layout.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
