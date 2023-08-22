import useStyles from "../../../styles/patientListStyle";
import TablePagination from "@material-ui/core/TablePagination";
import {usePatientListContext} from "../../context/PatientListContextProvider";

export default function Pagination() {
  const classes = useStyles();
  const { data, pagination, paginationDispatch, tableRef } = usePatientListContext();
  const handleChangePage = (event, newPage) => {
    paginationDispatch({
      payload: {
        prevPageNumber: pagination.pageNumber,
        pageNumber: newPage,
      },
    });
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };
  const handleChangeRowsPerPage = (event) => {
    paginationDispatch({
      payload: {
        pageSize: parseInt(event.target.value, 10),
        nextPageURL: "",
        prevPageURL: "",
        pageNumber: 0,
      },
    });
    if (tableRef && tableRef.current) tableRef.current.onQueryChange();
  };
  if (!data || !data.length) return null;
  return (
    <TablePagination
      id="patientListPagination"
      className={`${
        pagination.totalCount === 0 ? "ghost" : classes.pagination
      }`}
      rowsPerPageOptions={[5, 10, 20, 50]}
      onPageChange={handleChangePage}
      page={pagination.pageNumber}
      rowsPerPage={pagination.pageSize}
      onRowsPerPageChange={handleChangeRowsPerPage}
      count={pagination.totalCount}
      size="small"
      component="div"
      nextIconButtonProps={{
        disabled: pagination.disableNextButton,
        color: "primary",
      }}
      backIconButtonProps={{
        disabled: pagination.disablePrevButton,
        color: "primary",
      }}
      SelectProps={{ variant: "outlined" }}
    />
  );
}
