import { useCallback, useEffect, useRef, memo } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import TablePagination from "@mui/material/TablePagination";
import { useAppContext } from "../../context/PatientListContextProvider";
import { usePatientListStore } from "../../stores/patientListStore";
import {
  usePagination,
  usePatientData,
} from "../../stores/patientListSelectors";
import { isEmptyArray } from "../../helpers/utility";


const PaginationElement = memo(function PaginationElement({
  classes,
  pagination,
  handleChangePage,
  handleChangeRowsPerPage,
}) {
  if (!pagination) return null;
  return (
    <TablePagination
      id="patientListPagination"
      className={classes.pagination}
      rowsPerPageOptions={[5, 10, 20, 50]}
      onPageChange={handleChangePage}
      page={pagination.pageNumber}
      rowsPerPage={pagination.pageSize}
      onRowsPerPageChange={handleChangeRowsPerPage}
      count={pagination.totalCount}
      size="small"
      component="div"
      labelRowsPerPage="Rows per page"
      slotProps={{
        
        nextButtonIcon: {
          disabled: pagination.disableNextButton,
          color: "primary",
        },
        previousButtonIcon: {
          disabled: pagination.disablePrevButton,
          color: "primary",
        },
        nextButton: {
          disabled: pagination.disableNextButton,
          color: "primary",
        },
        previousButton: {
          disabled: pagination.disablePrevButton,
          color: "primary",
        },
        select: {
          variant: "standard"
        }
      }}
    />
  );
});

PaginationElement.propTypes = {
  classes: PropTypes.object,
  pagination: PropTypes.object,
  handleChangePage: PropTypes.func,
  handleChangeRowsPerPage: PropTypes.func,
};

const { updatePagination } = usePatientListStore.getState();

export default function Pagination() {
  const theme = useTheme();
  const classes = {
    pagination: {
      marginTop: theme.spacing(1),
      display: "inline-block",
      border: "2px solid #ececec",
    },
  };
  const { tableRef } = useAppContext();
  const data = usePatientData();
  const pagination = usePagination();
  const disabled = isEmptyArray(data);
  const cloneTableRef = useRef(null);

  const handleChangePage = useCallback(
    (event, newPage) => {
      if (event) event.stopPropagation();
      updatePagination({
        prevPageNumber: pagination.pageNumber,
        pageNumber: newPage,
      });
      cloneTableRef?.current?.onQueryChange();
    },
    [pagination?.pageNumber],
  );

  const handleChangeRowsPerPage = useCallback((event) => {
    if (event) event.stopPropagation();
    updatePagination({
      pageSize: parseInt(event.target.value, 10),
      nextPageURL: "",
      prevPageURL: "",
      pageNumber: 0,
    });
    cloneTableRef?.current?.onQueryChange();
  }, []);

  useEffect(() => {
    if (!tableRef?.current) return;
    if (cloneTableRef.current) return;
    cloneTableRef.current = tableRef.current;
  }, [tableRef]);

  if (disabled || !pagination) return null;

  return (
    <PaginationElement
      classes={classes}
      pagination={pagination}
      handleChangePage={handleChangePage}
      handleChangeRowsPerPage={handleChangeRowsPerPage}
    />
  );
}
