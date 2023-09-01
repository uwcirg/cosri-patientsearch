import { forwardRef, lazy, Suspense } from "react";
import Check from "@material-ui/icons/Check";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import ClearIcon from "@material-ui/icons/Clear";
import Delete from "@material-ui/icons/Delete";
import Edit from "@material-ui/icons/Edit";
import FirstPage from "@material-ui/icons/FirstPage";
import ArrowDownIcon from '@material-ui/icons/ArrowDropUp';
import ArrowUpIcon from '@material-ui/icons/ArrowDropDown';
import LastPage from "@material-ui/icons/LastPage";
import Search from "@material-ui/icons/Search";

export const tableIcons = {
  Check: forwardRef((props, ref) => (
    <Check {...props} ref={ref} className="success" />
  )),
  Clear: forwardRef((props, ref) => <ClearIcon {...props} ref={ref} />),
  Filter: forwardRef((props, ref) => (
    <Search {...props} ref={ref} color="primary" />
  )),
  FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
  Edit: forwardRef((props, ref) => (
    <Edit {...props} ref={ref} color="primary" />
  )),
  LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
  DetailPanel: forwardRef((props, ref) => (
    <div {...props} ref={ref} color="primary" className="detail-panel" />
  )),
  NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  PreviousPage: forwardRef((props, ref) => (
    <ChevronLeft {...props} ref={ref} />
  )),
  SortArrow: forwardRef((props, ref) => (
    <div style={{display: "flex", flexDirection:"column"}} {...props} ref={ref} color="primary">
      <ArrowDownIcon size="small" className="down"></ArrowDownIcon>
      <ArrowUpIcon size="small" className="up"></ArrowUpIcon>
    </div>
  )),
  Delete: forwardRef((props, ref) => (
    <Delete {...props} ref={ref} size="small" className="muted">
      Remove
    </Delete>
  )),
};
export const defaultTableOptions = {
  paginationTypestepped: "stepped",
  showFirstLastPageButtons: false,
  paging: false,
  padding: "dense",
  emptyRowsWhenPaging: false,
  debounceInterval: 300,
  detailPanelColumnAlignment: "right",
  toolbar: false,
  filtering: false,
  maxColumnSort: 1,
  thirdSortClick: false,
  search: false,
  showTitle: false,
  actionsColumnIndex: -1,
};
export const defaultPagination = {
  pageSize: 20,
  pageNumber: 0,
  prevPageNumber: 0,
  disablePrevButton: true,
  disableNextButton: true,
  totalCount: 0,
  nextPageURL: "",
  prevPageURL: "",
};
export const defaultFilters = {
  first_name: "",
  last_name: "",
  birth_date: "",
};
export const fieldNameMaps = {
  first_name: "given",
  last_name: "family",
  birth_date: "birthdate",
  last_accessed: "_lastUpdated",
  mrn: "identifier",
};
export const defaultColumns = [
  {
    label: "First Name",
    expr: "$.name[0].given[0]",
  },
  {
    label: "Last Name",
    expr: "$.name[0].family",
  },
  {
    label: "Birth Date",
    expr: "$.birthDate",
  },
  {
    label: "Last Accessed",
    defaultSort: "desc",
    expr: "$.meta.lastUpdated",
    dataType: "date",
  },
];
const UrineScreenComponent = lazy(() => import("../components/UrineScreen"));
const AgreementComponent = lazy(() => import("../components/Agreement"));
export const defaultMenuItems = [
  {
    text: "Add Urine Tox Screen",
    id: "UDS",
    component: (rowData) => (
      <Suspense fallback={<div>Loading...</div>}>
        <UrineScreenComponent rowData={rowData}></UrineScreenComponent>
      </Suspense>
    ),
  },
  {
    text: "Add Controlled Substance Agreement",
    id: "CS_agreement",
    component: (rowData) => (
      <Suspense fallback={<div>Loading...</div>}>
        <AgreementComponent rowData={rowData}></AgreementComponent>
      </Suspense>
    ),
  },
];
export const PDMP_SYSTEM_IDENTIFIER = "https://github.com/uwcirg/script-fhir-facade";
export const NON_PDMP_RESULT_MESSAGE = "<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>";
export const PDMP_SYSTEM_ERROR_MESSAGE = "<p>COSRI is unable to return PMP information. This may be due to PMP system being down or a problem with the COSRI connection to PMP.</p>";
export const noCacheParam = { cache: "no-cache" };
export const LAUNCH_BUTTON_LABEL = "VIEW";
export const CREATE_BUTTON_LABEL = "CREATE";
export const MORE_MENU_KEY = "MORE_MENU";
export const ACCESS_TOKEN_KEY = "access_token";
export const REALM_ACCESS_TOKEN_KEY = "realm_access";
export const MAX_MAIN_TABLE_WIDTH = "1280px";
