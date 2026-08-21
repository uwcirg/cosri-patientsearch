import React, { useCallback, useEffect, useRef, memo } from "react";
import PropTypes from "prop-types";
import TablePagination from "@mui/material/TablePagination";
import { usePatientDataContext } from "../../context/PatientListContextProvider";
import { usePatientListStore } from "../../stores/patientListStore";
import {
  usePagination,
  usePatientData,
} from "../../stores/patientListSelectors";
import { isEmptyArray } from "../../helpers/utility";


const PaginationElement = memo(function PaginationElement({
  pagination,
  handleChangePage,
  handleChangeRowsPerPage,
}) {
  if (!pagination) return null;
  return (
    <TablePagination
      id="patientListPagination"
      className="pagination__container"
      rowsPerPageOptions={[5, 10, 20, 50]}
      onPageChange={handleChangePage}
      page={pagination.pageNumber}
      rowsPerPage={pagination.pageSize}
      onRowsPerPageChange={handleChangeRowsPerPage}
      count={pagination.totalCount}
      size="small"
      component="div"
      labelRowsPerPage="Rows per page"
      sx={{
        "& .MuiTablePagination-selectIcon": {
          color: "primary.dark",
        },
        "& .MuiTablePagination-actions" : {
          color: "primary.dark"
        }
      }}
      slotProps={{
        nextButtonIcon: {
          disabled: pagination.disableNextButton,
        },
        previousButtonIcon: {
          disabled: pagination.disablePrevButton,
        },
        nextButton: {
          disabled: pagination.disableNextButton,
        },
        previousButton: {
          disabled: pagination.disablePrevButton,
        },
        select: {
          variant: "standard",
        },
      }}
    />
  );
});

PaginationElement.propTypes = {
  pagination: PropTypes.object,
  handleChangePage: PropTypes.func,
  handleChangeRowsPerPage: PropTypes.func,
};

const { updatePagination } = usePatientListStore.getState();

export default function Pagination() {
  const { tableRef } = usePatientDataContext();
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
      pagination={pagination}
      handleChangePage={handleChangePage}
      handleChangeRowsPerPage={handleChangeRowsPerPage}
    />
  );
}
