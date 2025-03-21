import React from "react";
import PropTypes from "prop-types";
import MaterialTable, { MTableActions } from "@material-table/core";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import { usePatientListContext } from "../../context/PatientListContextProvider";
import DropdownMenu from "./DropdownMenu";
import Error from "../Error";
import FilterRow from "./FilterRow";
import LaunchDialog from "./LaunchDialog";
import Legend from "./Legend";
import RefreshButton from "./RefreshButton";
import LoadingModal from "../LoadingModal";
import MyPatientsCheckbox from "./MyPatientsCheckbox";
import Pagination from "./Pagination";
import OverlayElement from "../OverlayElement";
import TestPatientsCheckbox from "./TestPatientsCheckbox";
import ReactivatingModal from "./ReactivatingModal";
import * as constants from "../../constants/consts";
import { addMamotoTracking, hasFlagForCheckbox } from "../../helpers/utility";

export default function PatientListTable() {
  const patientListCtx = usePatientListContext();
  const {
    patientListProps = {},
    tableProps = {},
    contextState,
  } = usePatientListContext();
  const {
    searchTitle,
    columns,
    userName,
    filterRowRef,
    getPatientList,
    shouldHideMoreMenu,
    shouldShowLegend,
    matomoSiteID,
    onUnload,
    errorMessage,
    enableFilterByTestPatients,
    filterByTestPatientsLabel,
    enableProviderFilter,
    myPatientsFilterLabel,
  } = patientListProps;

  const renderTitle = () => {
    const title = searchTitle ? searchTitle : null;
    if (!title) return false;
    return <h2>{title}</h2>;
  };

  const renderPatientSearchRow = () => <FilterRow ref={filterRowRef} />;

  const renderTestPatientsCheckbox = () => {
    if (!enableFilterByTestPatients) return false;
    return (
      <TestPatientsCheckbox
        label={filterByTestPatientsLabel}
      ></TestPatientsCheckbox>
    );
  };

  const renderMyPatientCheckbox = () => {
    if (!enableProviderFilter) return false;
    return (
      <MyPatientsCheckbox
        label={myPatientsFilterLabel}
        checked={hasFlagForCheckbox(constants.FOLLOWING_FLAG)}
      ></MyPatientsCheckbox>
    );
  };

  const renderDropdownMenu = (props) => {
    if (shouldHideMoreMenu()) return false;
    return (
      <DropdownMenu
        {...props}
        anchorEl={document.querySelector("#actions_" + props.data?.id)}
      ></DropdownMenu>
    );
  };

  React.useEffect(() => {
    if (matomoSiteID) {
      addMamotoTracking(matomoSiteID, userName);
    }
    window.addEventListener("unload", () => onUnload());
  }, [userName, matomoSiteID, onUnload]); //retrieval of settings should occur prior to patient list being rendered/initialized

  if (Object.keys(patientListCtx).length === 0)
    return <Error message="patient context error"></Error>;
  return (
    <>
      <Container className="container" id="patientList">
        {renderTitle()}
        <Error message={errorMessage} />
        <div className="flex">
          {/* patient search row */}
          {renderPatientSearchRow()}
          <div className="bottom-gap-2x">
            {renderMyPatientCheckbox()}
            {renderTestPatientsCheckbox()}
          </div>
        </div>
        {/* patient list table */}
        <div className={`table main`} aria-label="patient list table">
          <MaterialTable
            {...tableProps}
            data={
              //any change in query will invoke this function
              (query) => getPatientList(query)
            }
            hideSortIcon={false}
            //overlay
            components={{
              OverlayLoading: () => (
                <OverlayElement>
                  <CircularProgress></CircularProgress>
                </OverlayElement>
              ),
              Actions: (props) => (
                <div id={`actions_${props.data.id}`}>
                  <MTableActions
                    {...props}
                    columns={columns}
                    onColumnsChanged={() => false}
                  ></MTableActions>
                  {renderDropdownMenu(props)}
                </div>
              ),
            }}
            icons={constants.tableIcons}
          />
        </div>
        <LoadingModal open={contextState.openLoadingModal}></LoadingModal>
        <div className="flex-align-start">
          <Legend show={shouldShowLegend()}></Legend>
          <div>
            <RefreshButton></RefreshButton>
            <Pagination></Pagination>
          </div>
        </div>
        <LaunchDialog></LaunchDialog>
        <ReactivatingModal></ReactivatingModal>
      </Container>
    </>
  );
}

PatientListTable.propTypes = {
  data: PropTypes.object
};
