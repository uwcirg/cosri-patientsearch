import React, { useCallback, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import MaterialTable, { MTableActions } from "@material-table/core";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import { usePatientDataContext } from "../../context/PatientListContextProvider";
import {
  useSettingContext,
  useUserContext,
} from "../../context/AppContextProvider";
import { usePatientListStore } from "../../stores/patientListStore";
import {
  useCurrentRow,
  useCurrentFilters,
  usePatientIdsByCareTeamParticipant,
} from "../../stores/patientListSelectors";
import DetailPanel from "./DetailPanel";
import DropdownMenu from "./DropdownMenu";
import OverlayElement from "../OverlayElement";
import * as constants from "../../constants/consts";
import {
  fetchData,
  hasFlagForCheckbox,
  putPatientData,
  isEmptyArray,
} from "../../helpers/utility";

function SearchTitle({ title }) {
  if (!title) return null;
  return <h2 className="search-title">{title}</h2>;
}
SearchTitle.propTypes = {
  title: PropTypes.string,
};

function RowActions({ columns, ...props }) {
  return (
    <div id={`actions_${props.data?.id}`}>
      <MTableActions
        {...props}
        columns={columns}
        onColumnsChanged={() => false}
      />
      <DropdownMenu {...props} />
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

const {
  closeLoadingModal,
  setCurrentRow,
  setData,
  setError,
  setOpenMenu,
  emptyPagination,
  setContainNoPMPFlag,
  updatePagination,
  resetLaunchURL,
} = usePatientListStore.getState();

const handleOnPageUnload = () => {
  resetLaunchURL();
  closeLoadingModal();
  setCurrentRow(null);
};

export default function PatientListTable() {
  const theme = useTheme();
  const { getAppSettingByKey = () => null } = useSettingContext();
  const { user } = useUserContext();
  const {
    tableRef,
    appClients,
    columns,
    queryPatientList,
    handleLaunchApp,
    handleErrorCallback,
    needExternalAPILookup,
  } = usePatientDataContext();
  const currentFilters = useCurrentFilters();
  const currentRow = useCurrentRow();
  const selectedRowRef = useRef(null);
  const patientIdsByCareTeamParticipant =
    usePatientIdsByCareTeamParticipant() ??
    (hasFlagForCheckbox(constants.FOLLOWING_FLAG)
      ? user && user.followingPatientIds
        ? user.followingPatientIds
        : null
      : null);

  const shouldHideMoreMenu = useCallback(() => {
    return isEmptyArray(getAppSettingByKey(constants.MORE_MENU_KEY));
  }, [getAppSettingByKey]);

  const notInPDMP = useCallback(
    (rowData) => {
      if (getAppSettingByKey("ONLY_CREATE_PATIENT_IF_FOUND_EXTERNAL"))
        return false;
      if (!rowData) return false;
      if (isEmptyArray(rowData.identifier)) return true;
      return !rowData.identifier.find(
        (i) => i.system === constants.PDMP_SYSTEM_IDENTIFIER && i.value,
      );
    },
    [getAppSettingByKey],
  );

  const setNoPMPFlag = useCallback(
    (rawData) => {
      if (
        !isEmptyArray(rawData) &&
        rawData.filter((r) => notInPDMP(r)).length > 0
      )
        setContainNoPMPFlag(true);
    },
    [notInPDMP],
  );

  const tableActions = useMemo(() => {
    const moreMenu = !shouldHideMoreMenu()
      ? [
          {
            icon: () => <MoreHorizIcon color="primary" />,
            onClick: (e, row) => {
              e.stopPropagation();
              setCurrentRow(row);
              setOpenMenu(row);
            },
            tooltip: "More",
          },
        ]
      : [];
    if (isEmptyArray(appClients)) return moreMenu;
    const clientActions = appClients
      .filter((c) => !c.standalone)
      .map((c) => ({
        icon: () => (
          <span
            className="action-button"
            style={{ background: theme.palette.primary.main }}
          >
            {c.label}
          </span>
        ),
        onClick: (event, rowData) => {
          event.stopPropagation();
          if (
            columns.some(
              (col) => String(col.field).toLowerCase() === "last_accessed",
            )
          ) {
            putPatientData(
              rowData.id,
              rowData.resource,
              (e) => {
                handleErrorCallback(e);
                handleLaunchApp(rowData, c);
              },
              () => handleLaunchApp(rowData, c),
            );
            return;
          }
          handleLaunchApp(rowData, c);
        },
        tooltip: `Launch ${c.id}`,
      }));
    return [...clientActions, ...moreMenu];
  }, [
    appClients,
    columns,
    shouldHideMoreMenu,
    handleLaunchApp,
    handleErrorCallback,
    theme,
  ]);

  const getTableOptions = useCallback(
    (themeArg) => ({
      ...constants.defaultTableOptions,
      headerStyle: {
        backgroundColor: themeArg.palette.primary.lightest,
        padding: themeArg.spacing(1, 2, 1),
      },
      rowStyle: (rowData) => ({
        backgroundColor:
          needExternalAPILookup() && notInPDMP(rowData)
            ? themeArg.palette.primary.disabled
            : "#FFF",
      }),
      actionsCellStyle: {
        paddingLeft: themeArg.spacing(1),
        paddingRight: themeArg.spacing(1),
        justifyContent: "center",
      },
      detailPanelType: "single",
    }),
    [needExternalAPILookup, notInPDMP],
  );

  const getTableEditableOptions = useCallback(
    () => ({
      isDeleteHidden: () =>
        String(getAppSettingByKey("ENABLE_PATIENT_DELETE")).toLowerCase() !==
        "true",
      onRowDelete: (oldData) =>
        fetchData(`/fhir/Patient/${oldData.id}`, { method: "DELETE" })
          .then(() =>
            setTimeout(
              () =>
                setData(
                  (usePatientListStore.getState().data ?? []).filter(
                    (el) => el.id !== oldData.id,
                  ),
                ),
              500,
            ),
          )
          .catch(() => setError("Unable to remove patient from the list.")),
    }),
    [getAppSettingByKey],
  );

  const getTableRowEvent = useCallback(
    (event, rowData) => {
      event.stopPropagation();
      setCurrentRow(rowData);
      handleLaunchApp(rowData);
    },
    [handleLaunchApp],
  );

  const getTableLocalizations = useCallback(
    () => ({
      header: { actions: "" },
      pagination: { labelRowsSelect: "rows" },
      body: {
        deleteTooltip: "Remove from the list",
        editRow: {
          deleteText:
            "Are you sure you want to remove this patient from the list? (You can add them back later by searching for them)",
          saveTooltip: "OK",
        },
        emptyDataSourceMessage: "No record is found.",
      },
    }),
    [],
  );

  const tableProps = useMemo(
    () => ({
      columns,
      detailPanel: [
        {
          render: (d) => <DetailPanel data={d} />,
          isFreeAction: false,
        },
      ],
      actions: tableActions,
      editable: getTableEditableOptions(),
      localization: getTableLocalizations(),
      options: getTableOptions(theme),
      onRowClick: getTableRowEvent,
      tableRef,
    }),
    [
      columns,
      tableActions,
      getTableEditableOptions,
      getTableLocalizations,
      getTableOptions,
      theme,
      getTableRowEvent,
      tableRef,
    ],
  );

  const handleDeSelectRow = useCallback(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.classList.remove("selected-row");
      selectedRowRef.current = null;
    }
  }, []);

  useEffect(() => {
    handleDeSelectRow();
    if (!currentRow) return;
    const row = document
      .querySelector(`#actions_${currentRow.id}`)
      ?.closest("tr");
    if (row) {
      row.classList.add("selected-row");
      selectedRowRef.current = row;
    }
  }, [currentRow, handleDeSelectRow]);

  useEffect(() => {
    window.addEventListener("popstate", handleOnPageUnload);
    return () => window.removeEventListener("popstate", handleOnPageUnload);
  }, []);

  useEffect(() => {
    const unsubscribe = usePatientListStore.subscribe(
      (state) => state.launchURL,
      (launchURL) => {
        if (!launchURL) return;
        window.location = launchURL;
        setTimeout(handleOnPageUnload, 500);
      },
    );
    return unsubscribe;
  }, []);

  const ActionsComponent = useCallback(
    (props) => <RowActions {...props} columns={columns} />,
    [columns],
  );

  return (
    <div className="table main" aria-label="patient list table">
      <MaterialTable
        {...tableProps}
        data={(query) =>
          new Promise((resolve) => {
            queryPatientList(query, {
              filterByTestPatients:
                usePatientListStore.getState().filterByTestPatients,
              pagination: usePatientListStore.getState().pagination,
              patientIdsByCareTeamParticipant,
              searchFields: currentFilters,
            }).then((result) => {
              const {
                data,
                totalCount,
                error,
                entry,
                nextPageURL,
                prevPageURL,
                disableNextButton,
                disablePrevButton,
              } = result;

              if (error) {
                emptyPagination();
                handleErrorCallback(error);
                resolve(result);
                return;
              }

              if (needExternalAPILookup()) setNoPMPFlag(entry);
              updatePagination({
                nextPageURL,
                prevPageURL,
                disableNextButton,
                disablePrevButton,
                totalCount,
              });
              setData(data);
              resolve(result);
            });
          })
        }
        hideSortIcon={false}
        components={{
          OverlayLoading,
          Actions: ActionsComponent,
        }}
        icons={constants.tableIcons}
      />
    </div>
  );
}
