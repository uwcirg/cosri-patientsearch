import React from "react";
import { render } from "@testing-library/react";
import ProjectThemeProvider from "../context/ProjectThemeProvider";

/* eslint-disable react/prop-types */
const AllTheProviders = ({ children }) => {
  return (
      <ProjectThemeProvider>{children}</ProjectThemeProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from "@testing-library/react";


// override render method
export { customRender as render };
