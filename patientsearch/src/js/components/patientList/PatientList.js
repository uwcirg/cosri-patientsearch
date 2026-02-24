import React, { useCallback, useEffect } from "react";
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
import { addMamotoTracking } from "../../helpers/utility";

function SearchTitle({ title }) {
  if (!title) return null;
  return <h2 className="search-title">{title}</h2>;
}
SearchTitle.propTypes = {
  title: PropTypes.string,
};

function RowActions({ columns, ...props }) {
  return (
    <div id={`actions_${props.data.id}`}>
      <MTableActions
        {...props}
        columns={columns}
        onColumnsChanged={() => false}
      />
      <DropdownMenu
        {...props}
        anchorEl={document.querySelector("#actions_" + props.data?.id)}
      />
    </div>
  );
}
RowActions.propTypes = {
  columns: PropTypes.array,
  data: PropTypes.object,
};

function OverlayLoading() {
  return (
    <OverlayElement>
      <CircularProgress />
    </OverlayElement>
  );
}

export default function PatientListTable() {
  const patientListCtx = usePatientListContext();
  const { childrenProps = {} } = patientListCtx;

  const {
    tableProps,
    searchTitle,
    columns,
    userName,
    filterRowRef,
    getPatientList,
    matomoSiteID,
    errorMessage,
    isLoading,
  } = childrenProps["patientList"] ?? {};

  useEffect(() => {
    if (matomoSiteID) {
      addMamotoTracking(matomoSiteID, userName);
    }
  }, [userName, matomoSiteID]);

 
  const ActionsComponent = useCallback(
    (props) => <RowActions {...props} columns={columns} />,
    [columns]
  );

  if (!patientListCtx?.childrenProps?.patientList) {
    return <Error message="patient context error" />;
  }

  return (
    <Container className="container" id="patientList">
      <SearchTitle title={searchTitle} />
      <Error message={errorMessage} />
      <div className="flex">
        <FilterRow ref={filterRowRef} />
        <div className="bottom-gap-2x">
          <MyPatientsCheckbox />
          <TestPatientsCheckbox />
        </div>
      </div>
      <div className="table main" aria-label="patient list table">
        <MaterialTable
          {...tableProps}
          data={getPatientList}
          hideSortIcon={false}
          components={{
            OverlayLoading,
            Actions: ActionsComponent,
          }}
          icons={constants.tableIcons}
        />
      </div>
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
