import React from "react";
import PatientListContextProvider from "../../context/PatientListContextProvider";
import PatientListTable from "./PatientList";

export default function MainContent() {
  return (
    <PatientListContextProvider>
      <PatientListTable></PatientListTable>
    </PatientListContextProvider>
  );
}
