import makeStyles from '@mui/styles/makeStyles';
import TablePagination from "@mui/material/TablePagination";
import { usePatientListContext } from "../../context/PatientListContextProvider";

const useStyles = makeStyles((theme) => ({
  pagination: {
    marginTop: theme.spacing(1),
    display: "inline-block",
    border: "2px solid #ececec",
  },
}));

export default function Pagination() {
  const classes = useStyles();
  const {
    contextState,
    pagination,
    paginationDispatch = function () {},
    tableRef,
  } = usePatientListContext();
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
  if (!contextState.data || !contextState.data.length) return null;
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
      nextIconButtonProps={{
        disabled: pagination.disableNextButton,
        color: "primary",
      }}
      backIconButtonProps={{
        disabled: pagination.disablePrevButton,
        color: "primary",
      }}
      SelectProps={{ variant: "standard" }}
    />
  );
}
