import React from "react";
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
    // constants
    appSettings,
    userName,
    filterRowRef,
    // table props
    tableProps,
    //methods
    getAppSettingByKey,
    getColumns,
    getPatientList,
    shouldHideMoreMenu,
    shouldShowLegend,
    //states
    errorMessage,
    openLoadingModal,
    setOpenLoadingModal,
  } = usePatientListContext();

  const columns = getColumns();

  const renderTitle = () => {
    const title =
      appSettings && appSettings["SEARCH_TITLE_TEXT"]
        ? appSettings["SEARCH_TITLE_TEXT"]
        : null;
    if (!title) return false;
    return <h2>{title}</h2>;
  };

  const renderPatientSearchRow = () => <FilterRow ref={filterRowRef} />;

  const renderTestPatientsCheckbox = () => {
    if (!getAppSettingByKey("ENABLE_FILTER_FOR_TEST_PATIENTS")) return false;
    return (
      <TestPatientsCheckbox
        label={getAppSettingByKey("FILTER_FOR_TEST_PATIENTS_LABEL")}
      ></TestPatientsCheckbox>
    );
  };

  const renderMyPatientCheckbox = () => {
    if (!getAppSettingByKey("ENABLE_PROVIDER_FILTER")) return false;
    return (
      <MyPatientsCheckbox
        label={getAppSettingByKey("MY_PATIENTS_FILTER_LABEL")}
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
    if (appSettings) {
      addMamotoTracking(appSettings["MATOMO_SITE_ID"], userName);
    }
    window.addEventListener("unload", () => setOpenLoadingModal(false));
  }, [userName, appSettings, setOpenLoadingModal]); //retrieval of settings should occur prior to patient list being rendered/initialized

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
                    columns={getColumns()}
                    onColumnsChanged={() => false}
                  ></MTableActions>
                  {renderDropdownMenu(props)}
                </div>
              ),
            }}
            icons={constants.tableIcons}
          />
        </div>
        <LoadingModal open={openLoadingModal}></LoadingModal>
        <div className="flex-align-start">
          <Legend show={shouldShowLegend()}></Legend>
          <div>
            <RefreshButton></RefreshButton>
            <Pagination></Pagination>
          </div>
        </div>
        <LaunchDialog></LaunchDialog>
        <ReactivatingModal></ReactivatingModal>
        {/* {renderDropdownMenu()} */}
      </Container>
    </>
  );
}
