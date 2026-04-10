import React from "react";
import PatientListContextProvider from "../../context/PatientListContextProvider";
import PatientListContainer from "./PatientListContainer";

export default function MainContent() {
  return (
    <PatientListContextProvider>
      <PatientListContainer />
    </PatientListContextProvider>
  );
}
