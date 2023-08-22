import React from "react";
import { useTheme } from "@material-ui/core/styles";
import MaterialTable from "@material-table/core";
import CircularProgress from "@material-ui/core/CircularProgress";
import Container from "@material-ui/core/Container";
import useStyles from "../../../styles/patientListStyle";
import { usePatientListContext } from "../../context/PatientListContextProvider";
import DetailPanel from "./DetailPanel";
import DropdownMenu from "./DropdownMenu";
import Error from "../Error";
import FilterRow from "./FilterRow";
import LaunchDialog from "./LaunchDialog";
import Legend from "./Legend";
import RefreshButton from "./RefreshButton";
import Title from "./Title";
import LoadingModal from "../LoadingModal";
import MyPatientsCheckbox from "./MyPatientsCheckbox";
import Pagination from "./Pagination";
import OverlayElement from "../OverlayElement";
import TestPatientsCheckbox from "./TestPatientsCheckbox";
import * as constants from "../../constants/consts";
import { addMamotoTracking } from "../../helpers/utility";

export default function PatientListTable() {
  const theme = useTheme();
  const classes = useStyles();
  let {
    // constants
    appSettings,
    errorStyle,
    userName,
    userError,
    tableRef,

    //methods
    handleErrorCallback,
    handlePageUnload,
    getColumns,
    getPatientList,
    getTableActions,
    getTableRowEvent,
    getTableEditableOptions,
    getTableLocalizations,
    getTableOptions,
    //states
    errorMessage,
    openLoadingModal,
  } = usePatientListContext();

  if (!handleErrorCallback) handleErrorCallback = function () {};
  if (!handlePageUnload) handlePageUnload = function () {};
  if (!getColumns)
    getColumns = function () {
      return [];
    };
  if (!getPatientList)
    getPatientList = function () {
      return [];
    };
  if (!getTableActions) getTableActions = function () {};
  if (!getTableRowEvent) getTableRowEvent = function () {};
  if (!getTableEditableOptions) getTableEditableOptions = function () {};
  if (!getTableLocalizations) getTableLocalizations = function () {};
  if (!getTableOptions) getTableOptions = function () {};

  const renderPatientSearchRow = () => (
    <table className={classes.filterTable}>
      <tbody>
        <FilterRow />
      </tbody>
    </table>
  );

  React.useEffect(() => {
    //when page unloads, remove loading indicator
    window.addEventListener("beforeunload", handlePageUnload);
    if (parseInt(userError) === 401) {
      handleErrorCallback({ status: 401 });
      return;
    }
    if (appSettings) {
      addMamotoTracking(appSettings["MATOMO_SITE_ID"], userName);
    }
    return () => {
      window.removeEventListener("beforeunload", handlePageUnload);
    };
  }, [userError, userName, appSettings]); //retrieval of settings should occur prior to patient list being rendered/initialized

  return (
    <Container className={classes.container} id="patientList">
      <Title></Title>
      <Error message={errorMessage} style={errorStyle} />
      <div className="flex">
        {/* patient search row */}
        {renderPatientSearchRow()}
        <div className={classes.tableOptionContainers}>
          <MyPatientsCheckbox></MyPatientsCheckbox>
          <TestPatientsCheckbox></TestPatientsCheckbox>
        </div>
      </div>
      {/* patient list table */}
      <div className={`${classes.table} main`} aria-label="patient list table">
        <MaterialTable
          className={classes.table}
          columns={getColumns()}
          data={
            //any change in query will invoke this function
            (query) => getPatientList(query)
          }
          tableRef={tableRef}
          hideSortIcon={false}
          detailPanel={[
            {
              render: (data) => {
                return <DetailPanel data={data}></DetailPanel>;
              },
              isFreeAction: false,
            },
          ]}
          //overlay
          components={{
            OverlayLoading: () => (
              <OverlayElement>
                <CircularProgress></CircularProgress>
              </OverlayElement>
            ),
          }}
          actions={getTableActions()}
          options={getTableOptions(theme)}
          icons={constants.tableIcons}
          onRowClick={(event, rowData) => {
            getTableRowEvent(event, rowData);
          }}
          editable={getTableEditableOptions()}
          localization={getTableLocalizations()}
        />
      </div>
      <LoadingModal open={openLoadingModal}></LoadingModal>
      <div className={classes.flexContainer}>
        <Legend></Legend>
        <div>
          <RefreshButton></RefreshButton>
          <Pagination></Pagination>
        </div>
      </div>
      <LaunchDialog></LaunchDialog>
      <DropdownMenu></DropdownMenu>
    </Container>
  );
}
