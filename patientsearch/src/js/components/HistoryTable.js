import PropTypes from "prop-types";
import React from "react";
import { useTheme } from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";
import MaterialTable, {
  MTableActions,
  MTableAction,
} from "@material-table/core";
import TablePagination from "@mui/material/TablePagination";
import CircularProgress from "@mui/material/CircularProgress";
import Error from "./Error";
import { fetchData } from "../helpers/utility";
import { tableIcons } from "../constants/consts";

const useStyles = makeStyles((theme) => ({
  root: {
    flexShrink: 0,
    marginTop: theme.spacing(2),
  },
  errorContainer: {
    marginTop: theme.spacing(2),
  },
  overlayContainer: {
    display: "table",
    width: "100%",
    height: "100%",
    background: "rgb(255 255 255 / 70%)",
  },
  overlayElement: {
    display: "table-cell",
    width: "100%",
    height: "100%",
    verticalAlign: "middle",
    textAlign: "center",
  },
  paginationRoot: {
    minHeight: theme.spacing(3),
    display: "block",
    float: "right",
    overflowX: "auto",
  },
  paginationToolbar: {
    paddingLeft: theme.spacing(2),
  },
  paginationActions: {
    color: theme.palette.primary.main,
  },
}));

export default function HistoryTable(props) {
  const theme = useTheme();
  const classes = useStyles();
  const [errorMessage, setErrorMessage] = React.useState("");
  const errorStyle = { display: errorMessage ? "block" : "none" };
  const [data, setData] = React.useState(props.data);
  const customOptions = props.options ? props.options : {};
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 5));
    setPage(0);
  };
  const defaultOptions = {
    padding: "dense",
    emptyRowsWhenPaging: false,
    toolbar: false,
    filtering: false,
    maxColumnSort: 1,
    search: false,
    showTitle: false,
    pageSizeOptions: [5],
    headerStyle: {
      backgroundColor: theme.palette.primary.lightest,
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
    },
    actionsCellStyle: {
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
      justifyContent: "center",
    },
    actionsColumnIndex: -1,
  };
  const localizations = {
    header: {
      actions: "",
    },
    body: {
      deleteTooltip: "Remove record",
      editRow: {
        deleteText: "Are you sure you want to remove this record?",
        saveTooltip: "OK",
      },
    },
    pagination: {
      labelDisplayedRows: "records",
      labelRowsPerPage: "Records per page",
    },
  };
  const renderTablePagination = (parentProps) => (
    <TablePagination
      count={data.length}
      page={page}
      onPageChange={(e, page) => {
        handleChangePage(e, page);
        if (parentProps.onChangePage) parentProps.onChangePage(e, page);
        if (parentProps.onPageChange) parentProps.onPageChange(e, page);
      }}
      rowsPerPageOptions={[5]}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(e) => {
        handleChangeRowsPerPage(e);
        if (parentProps.onChangeRowsPerPage) parentProps.onChangeRowsPerPage(e);
        if (parentProps.onRowsPerPageChange) parentProps.onRowsPerPageChange(e);
      }}
      classes={{
        root: classes.paginationRoot,
        actions: classes.paginationActions,
        toolbar: classes.paginationToolbar,
      }}
      labelRowsPerPage="Records per page:"
    />
  );
  const renderOverloadingComponent = () => (
    <div className={classes.overlayContainer}>
      <div className={classes.overlayElement}>
        <CircularProgress></CircularProgress>
      </div>
    </div>
  );
  const renderError = () => (
    <div className={classes.errorContainer}>
      <Error message={errorMessage} style={errorStyle} />
    </div>
  );
  const columns = props.columns ?? [];
  return (
    <React.Fragment>
      <div className={classes.root}>
        <MaterialTable
          className="history"
          columns={columns}
          data={data}
          options={{
            ...defaultOptions,
            ...customOptions,
          }}
          icons={tableIcons}
          loadingType="linear"
          localization={localizations}
          //overlay
          components={{
            OverlayLoading: () => renderOverloadingComponent(),
            Pagination: (parentProps) => renderTablePagination(parentProps),
            Actions: (props) => (
              <MTableActions
                {...props}
                columns={columns}
                onColumnsChanged={() => false}
                index={props?.data?.id}
              ></MTableActions>
            ),
            Action: (props) => {
              return (
                <MTableAction
                  {...props}
                  columns={columns}
                  onColumnsChanged={() => false}
                ></MTableAction>
              );
            },
          }}
          editable={{
            isEditable: (rowData) => !rowData.readonly,
            isEditHidden: (rowData) => rowData.readonly,
            isDeletable: (rowData) => !rowData.readonly,
            isDeleteHidden: (rowData) => rowData.readonly,
            onRowUpdate: (newData, oldData) => {
              return fetchData(props.APIURL + oldData.id, {
                method: "PUT",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                cache: "no-cache",
                body: JSON.stringify(
                  props.submitDataFormatter
                    ? props.submitDataFormatter(newData)
                    : newData
                ),
              })
                .then(() => {
                  const dataUpdate = [...data];
                  // In dataUpdate, find target
                  const target = dataUpdate.find((el) => el.id === oldData.id);
                  const index = dataUpdate.indexOf(target);
                  dataUpdate[index] = newData;
                  setData([...dataUpdate]);
                  if (props.onRowUpdate)
                    setTimeout(() => props.onRowUpdate(), 350);
                })
                .catch((e) => {
                  setErrorMessage(
                    "Unable to update patient from the list." + e
                  );
                });
            },
            onRowDelete: (oldData) =>
              fetchData(props.APIURL + oldData.id, { method: "DELETE" })
                .then(() => {
                  const dataDelete = [...data];
                  const target = dataDelete.find((el) => el.id === oldData.id);
                  const index = dataDelete.indexOf(target);
                  dataDelete.splice(index, 1);
                  setData([...dataDelete]);
                  setErrorMessage("");
                  if (props.onRowDelete)
                    setTimeout(() => props.onRowDelete(), 350);
                })
                .catch((e) => {
                  setErrorMessage(
                    "Unable to remove patient from the list. " + e
                  );
                }),
          }}
        />
      </div>
      {renderError()}
    </React.Fragment>
  );
}
HistoryTable.propTypes = {
  data: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  APIURL: PropTypes.string.isRequired,
  submitDataFormatter: PropTypes.func,
  onRowUpdate: PropTypes.func,
  onRowDelete: PropTypes.func,
  options: PropTypes.object,
};
