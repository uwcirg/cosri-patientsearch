import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function Title() {
  const { appSettings } = usePatientListContext();
  if (!appSettings) return null;
  const title = appSettings["SEARCH_TITLE_TEXT"]
    ? appSettings["SEARCH_TITLE_TEXT"]
    : null;
  if (!title) return false;
  return <h2>{title}</h2>;
}
