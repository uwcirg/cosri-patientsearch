import React, { forwardRef, lazy, Suspense } from "react";
import Check from "@mui/icons-material/Check";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import ClearIcon from "@mui/icons-material/Clear";
import Delete from "@mui/icons-material/Delete";
import Edit from "@mui/icons-material/Edit";
import FirstPage from "@mui/icons-material/FirstPage";
import ArrowDownIcon from "@mui/icons-material/ArrowDropUp";
import ArrowUpIcon from "@mui/icons-material/ArrowDropDown";
import LastPage from "@mui/icons-material/LastPage";
import Search from "@mui/icons-material/Search";
import { isEmptyArray } from "../helpers/utility";

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
    <div
      style={{ display: "flex", flexDirection: "column" }}
      {...props}
      ref={ref}
      color="primary"
    >
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

// FHIR to RowData property mappings
export const FHIR_TO_DATA_FIELD_MAPPINGS = {
  given: "firstName",
  family: "lastName",
  name: "lastName",
  birthdate: "birthDate",
  telecom: "telephone",
  identifier: "identifier",
  address: "address",
};

// Resolve the dataKey - uses explicit dataKey, standard mapping, or falls back to field name
export const resolveDataKey = (field) => {
  if (!field) return null;
  // Priority 1: Explicit dataKey
  if (field.dataKey) return field.dataKey;

  // Priority 2: map to data key from FHIR field
  if (FHIR_TO_DATA_FIELD_MAPPINGS[field.name]) {
    return FHIR_TO_DATA_FIELD_MAPPINGS[field.name];
  }

  // Priority 3: Fall back to field name
  return field.name;
};

// Auto-detect field type based on field name/dataKey
export const autoDetectFieldType = (field) => {
  // Use dataKey if provided, otherwise fall back to field name
  const key = (field.dataKey || field.name).toLowerCase();

  // Auto-detect based on common field names
  if (
    key.includes("phone") ||
    key.includes("telecom") ||
    key.includes("tel") ||
    key.includes("mobile")
  ) {
    return "phone";
  }
  if (field.type === "date" || key.includes("date") || key.includes("birth")) {
    return "date";
  }
  if (key.includes("email") || key.includes("mail")) {
    return "email";
  }
  if (key.includes("name") || key.includes("given") || key.includes("family")) {
    return "text";
  }
  // other keys as needed

  return "text";
};

export const processFieldConfig = (configField = {}) => {
  if (!configField) return null;

  const processed = { ...configField };

  // Resolve dataKey using fallback
  processed.dataKey = resolveDataKey(processed);

  // Use explicit maskType if provided, otherwise auto-detect
  const fieldType =
    processed.maskType || processed.fieldType || autoDetectFieldType(processed);

  // If it's a masked field, apply the appropriate mask
  if (processed.type === "masked") {
    const maskConfig = FIELD_MASKS[fieldType];
    if (maskConfig) {
      processed.mask = maskConfig.mask;
      // Use provided placeholder if exists, otherwise use mask's default
      processed.placeholder = processed.placeholder || maskConfig.placeholder;
      processed.showMask =
        processed.showMask !== undefined
          ? processed.showMask
          : maskConfig.showMask;
    } else {
      console.warn(
        `Unknown mask type: ${fieldType} for field ${processed.name}`
      );
    }
  }

  return processed;
};

export const getSearchFields = (configFields) => {
  const fieldsTOUse = !isEmptyArray(configFields)
    ? configFields.map(processFieldConfig)
    : defaultSearchFields;
  return fieldsTOUse;
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
export const defaultSearchableFields = [
  "given",
  "name",
  "birthdate",
  "telecom"
];

export const defaultSearchFields = [
  {
    name: "given",
    type: "text",
    placeholder: "First Name",
    optional: false,
    fhirKey: "given",
    externalKey: "subject:Patient.name.given",
    exactMatch: true,
    icon: "search",
    required: true
  },
  {
    name: "name",
    type: "text",
    placeholder: "Last Name",
    optional: false,
    fhirKey: "family",
    externalKey: "subject:Patient.name.family",
    exactMatch: true,
    icon: "search",
    required: true
  },
  {
    name: "birthdate",
    type: "date",
    placeholder: "YYYY-MM-DD",
    optional: false,
    fhirKey: "birthdate",
    externalKey: "subject:Patient.birthdate",
    externalPrefix: "eq",
    exactMatch: false,
    isDate: true,
    required: true
  },
  // {
  //   name: "telecom",
  //   type: "masked",
  //   required: false,
  //   fhirKey: "telecom",
  //   externalKey: "subject:Patient.telecom",
  //   exactMatch: false,
  // },
].map(processFieldConfig);

// data field to FHIR field mappings
export const DATA_TO_FHIR_FIELD_MAPPINGS = {
  given: "given",
  first_name: "given",
  firstName: "given",
  family: "family",
  last_name: "family",
  lastName: "family",
  birthdate: "birthdate",
  birthDate: "birthdate",
  birth_date: "birthdate",
  lastAccessed: "_lastUpdated",
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
export const FIELD_MASKS = {
  phone: {
    mask: [
      "(",
      /[1-9]/,
      /\d/,
      /\d/,
      ")",
      " ",
      /\d/,
      /\d/,
      /\d/,
      "-",
      /\d/,
      /\d/,
      /\d/,
      /\d/,
    ],
    placeholder: "(XXX) XXX-XXXX",
    showMask: false,
  },
  zipCode: {
    mask: [/\d/, /\d/, /\d/, /\d/, /\d/, "-", /\d/, /\d/, /\d/, /\d/],
    placeholder: "XXXXX-XXXX",
    showMask: false,
  },
  date: {
    placeholder: "YYYY-MM-DD",
  },
};

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
export const PDMP_SYSTEM_IDENTIFIER =
  "https://github.com/uwcirg/script-fhir-facade";
export const NON_PDMP_RESULT_MESSAGE =
  "<div>The patient was not found in the PMP. This could be due to:</div><ul><li>No previous controlled substance medications dispensed</li><li>Incorrect spelling of name or incorrect date of birth.</li></ul><div>Please double check name spelling and date of birth.</div>";
export const PDMP_SYSTEM_ERROR_MESSAGE =
  "<p>COSRI is unable to return PMP information. This may be due to PMP system being down or a problem with the COSRI connection to PMP.</p>";
export const noCacheParam = { cache: "no-cache" };
export const searchHeaderParams = {
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  ...noCacheParam,
};
export const LAUNCH_BUTTON_LABEL = "VIEW";
export const CREATE_BUTTON_LABEL = "CREATE";
export const MORE_MENU_KEY = "MORE_MENU";
export const ACCESS_TOKEN_KEY = "access_token";
export const REALM_ACCESS_TOKEN_KEY = "realm_access";
export const MAX_MAIN_TABLE_WIDTH = "1200px";
export const FOLLOWING_FLAG = "following";
export const MIN_QUERY_COUNT = 500;
export const objErrorStatus = {
  401: {
    text: "Unauthorized.",
    logoutURL: "/logout?unauthorized=true",
  },
  403: {
    text: "Forbidden.",
    logoutURL: "/logout?forbidden=true",
  },
};
export const UWMC_LAB_ORDER_SYSTEM_URL =
  "http://www.uwmedicine.org/lab_order_id";
export const EHR_SYSTEM_URLS = [UWMC_LAB_ORDER_SYSTEM_URL];
