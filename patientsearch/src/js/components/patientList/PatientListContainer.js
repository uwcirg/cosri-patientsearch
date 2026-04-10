import React, { useEffect } from "react";
import PropTypes from "prop-types";
import Container from "@mui/material/Container";
import { useSettingContext } from "../../context/SettingContextProvider";
import { useUserContext } from "../../context/UserContextProvider";
import {
  usePatientListError,
  usePatientListLoading,
} from "../../stores/patientListSelectors";
import PatientListTable from "./PatientListTable";
import Error from "../Error";
import FilterRow from "./FilterRow";
import LaunchDialog from "./LaunchDialog";
import Legend from "./Legend";
import RefreshButton from "./RefreshButton";
import LoadingModal from "../LoadingModal";
import MyPatientsCheckbox from "./MyPatientsCheckbox";
import Pagination from "./Pagination";
import TestPatientsCheckbox from "./TestPatientsCheckbox";
import ReactivatingModal from "./ReactivatingModal";
import { addMamotoTracking } from "../../helpers/utility";

function SearchTitle({ title }) {
  if (!title) return null;
  return <h2 className="search-title">{title}</h2>;
}
SearchTitle.propTypes = {
  title: PropTypes.string,
};

export default function PatientListContainer() {
  const { getAppSettingByKey = () => null } = useSettingContext();
  const matomoSiteID = getAppSettingByKey("MATOMO_SITE_ID");
  const searchTitle = getAppSettingByKey("SEARCH_TITLE_TEXT");
  const { user } = useUserContext();
  const { userName } = user || {};
  const errorMessage = usePatientListError();
  const isLoading = usePatientListLoading();

  useEffect(() => {
    if (matomoSiteID) {
      addMamotoTracking(matomoSiteID, userName);
    }
  }, [userName, matomoSiteID]);

  return (
    <Container className="container" id="patientList">
      <SearchTitle title={searchTitle} />
      <Error message={errorMessage} />
      <div className="flex">
        <FilterRow />
        <div className="bottom-gap-2x toolbar-side-container">
          <MyPatientsCheckbox />
          <TestPatientsCheckbox />
        </div>
      </div>
      <PatientListTable />
      <LoadingModal open={isLoading} />
      <div className="flex-align-start">
        <Legend />
        <div>
          <RefreshButton />
          <Pagination />
        </div>
      </div>
      <LaunchDialog />
      <ReactivatingModal />
    </Container>
  );
}
