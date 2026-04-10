import React, { useCallback, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import MaterialTable, { MTableActions } from "@material-table/core";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import { useAppContext } from "../../context/PatientListContextProvider";
import { useSettingContext } from "../../context/SettingContextProvider";
import { useUserContext } from "../../context/UserContextProvider";
import { usePatientListStore } from "../../stores/patientListStore";
import { usePagination } from "../../stores/patientListSelectors";
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
  getUrlParameter,
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
    setCurrentRow,
    setData,
    setError,
    setOpenMenu,
    emptyPagination,
    setContainNoPMPFlag,
    updatePagination,
    resetLaunchURL,
  } = usePatientListStore.getState();

export default function PatientListTable() {
  const theme = useTheme();
  const { getAppSettingByKey = () => null } = useSettingContext();
  const { user } = useUserContext();
  const {
    tableRef,
    appClients,
    columns,
    formatRowData,
    handleLaunchApp,
    handleErrorCallback,
    needExternalAPILookup,
  } = useAppContext();
  const currentFilters = useCurrentFilters();
  const currentRow = useCurrentRow();
  const currentPagination = usePagination();
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
    theme
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
      isDeleteHidden: () => String(getAppSettingByKey("ENABLE_PATIENT_DELETE")).toLowerCase() !== "true",
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
          deleteText: "Are you sure you want to remove this patient from the list? (You can add them back later by searching for them)",
          saveTooltip: "OK",
        },
        emptyDataSourceMessage: (
          <div
            id="emptyDataContainer"
            className="flex-center warning notice"
          >No record is found.</div>
        )
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

  const getDefaultSortColumn = useCallback(
    () =>
      isEmptyArray(columns) ? null : columns.find((c) => c.defaultSort) || null,
    [columns],
  );
  const getSortDirectives = useCallback(
    (orderByCollection) => {
      let sortField = null,
        sortDirection = null;
      if (!isEmptyArray(orderByCollection)) {
        const of_ = orderByCollection[0];
        const obf = columns[of_.orderBy];
        if (obf) {
          const mc = columns.find((c) => c.field === obf.field);
          sortField =
            mc?.sortBy ??
            constants.DATA_TO_FHIR_FIELD_MAPPINGS[obf.field] ??
            obf.field;
          if (sortField) sortDirection = of_.orderDirection;
        }
      }
      if (!sortField) {
        const dc = getDefaultSortColumn();
        sortField = dc
          ? (constants.DATA_TO_FHIR_FIELD_MAPPINGS[dc.field] ?? dc.field)
          : "_lastUpdated";
        sortDirection = dc?.defaultSort ?? "desc";
      }
      return { sortField, sortDirection: sortDirection ?? "desc" };
    },
    [columns, getDefaultSortColumn],
  );

  const getSearchString = useCallback(() => {
    if (isEmptyArray(currentFilters)) return "";
    const fb = [];
    currentFilters.forEach((item) => {
      const fhirField =
        constants.DATA_TO_FHIR_FIELD_MAPPINGS[item.field] ?? item.field;
      if (item.value) fb.push(`${fhirField}:contains=${item.value}`);
    });
    return fb.join("&");
  }, [currentFilters]);

  const getPatientListQueryURL = useCallback(
    (query) => {
      const { sortField, sortDirection } = getSortDirectives(
        query.orderByCollection,
      );
      const sortMinus = sortField && sortDirection !== "asc" ? "-" : "";
      const searchString = getSearchString();
      const filterByTestPatients =
        usePatientListStore.getState().filterByTestPatients;
      const { pageSize, pageNumber, prevPageNumber, nextPageURL, prevPageURL } =
        usePatientListStore.getState().pagination;

      let apiURL = `/fhir/Patient?_include=Patient:link&_total=accurate&_count=${pageSize}`;
      if (!isEmptyArray(patientIdsByCareTeamParticipant))
        apiURL += `&_id=${patientIdsByCareTeamParticipant.join(",")}`;
      if (
        getAppSettingByKey("ENABLE_FILTER_FOR_TEST_PATIENTS") &&
        !filterByTestPatients
      )
        apiURL += `&_security:not=HTEST`;
      if (pageNumber > prevPageNumber && nextPageURL) apiURL = nextPageURL;
      else if (pageNumber < prevPageNumber && prevPageURL) apiURL = prevPageURL;
      if (searchString && apiURL.indexOf("contains") === -1)
        apiURL += `&${searchString}`;
      if (sortField && apiURL.indexOf("sort") === -1)
        apiURL += `&_sort=${sortMinus}${sortField}`;
      return apiURL;
    },
    [
      getSortDirectives,
      getSearchString,
      patientIdsByCareTeamParticipant,
      getAppSettingByKey,
    ],
  );

  const getLinksFromResponse = useCallback((response) => {
    if (!response) return {};
    const find = (rel) =>
      !isEmptyArray(response.link)
        ? response.link.filter((i) => i.relation === rel)
        : null;
    const self_ = find("self"),
      next_ = find("next"),
      prev_ = find("previous");
    const hasSelf = !isEmptyArray(self_);
    return {
      nextURL: !isEmptyArray(next_) ? next_[0].url : "",
      previousURL: !isEmptyArray(prev_)
        ? prev_[0].url
        : hasSelf
          ? self_[0].url
          : "",
      selfURL: hasSelf ? self_[0].url : "",
    };
  }, []);

  const getPatientList = useCallback(
    (query) => {
      const defaults = { data: [], page: 0, totalCount: 0 };
      return new Promise((resolve) => {
        fetchData(
          getPatientListQueryURL(query),
          constants.noCacheParam,
          (e) => {
            emptyPagination();
            handleErrorCallback(e);
            resolve(defaults);
          },
        )
          .then((response) => {
            if (!response || isEmptyArray(response.entry)) {
              emptyPagination();
              resolve(defaults);
              return;
            }
            if (needExternalAPILookup()) setNoPMPFlag(response.entry);
            const { nextURL, previousURL, selfURL } =
              getLinksFromResponse(response);
            let currentPage = 0;
            if (selfURL) {
              const off = getUrlParameter("_getpagesoffset", new URL(selfURL));
              if (off) currentPage = off / query.pageSize;
            }
            updatePagination({
              nextPageURL: nextURL,
              prevPageURL: previousURL,
              disableNextButton: !nextURL,
              disablePrevButton: currentPagination?.pageNumber === 0,
              totalCount: response.total,
            });
            const patientResources = response.entry.filter(
              (i) => i.resource?.resourceType === "Patient",
            );
            const responseData = formatRowData(patientResources);
            const resolvedData = {
              data: responseData,
              page: currentPage,
              totalCount: response.total,
            };
            const additionalParams = getAppSettingByKey(
              "FHIR_REST_EXTRA_PARAMS_LIST",
            );
            const eligible = additionalParams
              ? additionalParams.filter(
                  (r) =>
                    typeof r === "string" ||
                    (typeof r === "object" && r.resourceType),
                )
              : [];
            if (isEmptyArray(eligible)) {
              setData(responseData);
              resolve(resolvedData);
              return;
            }
            const ids = patientResources.map((i) => i.resource.id).join(",");
            const requests = eligible.map((request) => {
              const {
                resourceType,
                queryParams,
                referenceElement = "patient",
              } = typeof request === "object" ? request : {};
              const params = ["_count=1000", `${referenceElement}=${ids}`];
              const qs =
                typeof request === "string"
                  ? request +
                    (request.includes("?") ? "" : "?") +
                    params.join("&")
                  : `${resourceType}?${[...params, queryParams].join("&")}`;
              return fetchData(`/fhir/${qs}`, constants.noCacheParam);
            });
            Promise.all(requests)
              .then((results) => {
                if (isEmptyArray(results)) {
                  setData(responseData);
                  resolve(resolvedData);
                  return;
                }
                const enriched = patientResources.map((item) => {
                  const sid = item.resource.id;
                  if (!item.resource["resources"])
                    item.resource["resources"] = [];
                  results.forEach((res) => {
                    if (isEmptyArray(res.entry)) return;
                    item.resource["resources"] = [
                      ...item.resource["resources"],
                      ...res.entry
                        .filter((o) => {
                          const mr = additionalParams.filter(
                            (ap) =>
                              ap.resourceType &&
                              ap.resourceType === o.resource.resourceType,
                          );
                          const ref =
                            mr.length > 0 ? mr[0].referenceElement : "subject";
                          return (
                            o.resource?.[ref]?.reference?.split("/")[1] === sid
                          );
                        })
                        .map((ri) => ri.resource),
                    ];
                  });
                  return item;
                });
                const resultData = formatRowData(enriched);
                setData(resultData);
                resolve({
                  data: resultData,
                  page: currentPage,
                  totalCount: response.total,
                });
              })
              .catch((e) => {
                console.log(e);
                setData(responseData);
                setError(
                  "Error retrieving additional FHIR resources.  See console for detail.",
                );
                resolve(resolvedData);
              });
          })
          .catch((error) => {
            handleErrorCallback(error);
            resolve(defaults);
          });
      });
    },
    [
      getPatientListQueryURL,
      needExternalAPILookup,
      setNoPMPFlag,
      getLinksFromResponse,
      formatRowData,
      getAppSettingByKey,
      handleErrorCallback,
      currentPagination?.pageNumber
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
    const h = () => resetLaunchURL();
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, []);

  useEffect(() => {
    const unsubscribe = usePatientListStore.subscribe(
      (state) => state.launchURL,
      (launchURL) => {
        if (!launchURL) return;
        setTimeout(() => {
          window.location = launchURL;
          setTimeout(() => resetLaunchURL(), 250);
        }, 50);
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
        data={getPatientList}
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
