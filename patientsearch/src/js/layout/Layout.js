import PropTypes from "prop-types";
import React from "react";
import Header from "../components/Header";
import SystemBanner from "../components/SystemBanner";
import ProjectThemeProvider from "../context/ProjectThemeProvider";
import SettingContextProvider from "../context/SettingContextProvider";
import UserContextProvider from "../context/UserContextProvider";
import "../../styles/app.scss";

export default function Layout({children}) {
  return (
    <React.Fragment>
      <SettingContextProvider>
        <ProjectThemeProvider>
          <UserContextProvider>
              <SystemBanner />
              <Header />
              {children}
          </UserContextProvider>
        </ProjectThemeProvider>
      </SettingContextProvider>
    </React.Fragment>
  );
}
Layout.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
