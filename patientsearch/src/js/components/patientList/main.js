import PatientListContextProvider from "../../context/PatientListContextProvider";
import PatientListTable from "./PatientListTable";

export default function MainContent() {
  return (
    <PatientListContextProvider>
      <PatientListTable></PatientListTable>
    </PatientListContextProvider>
  );
}
