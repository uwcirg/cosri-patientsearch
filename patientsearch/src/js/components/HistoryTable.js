import PropTypes from 'prop-types';
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import MaterialTable from "@material-table/core";
import TablePagination from "@material-ui/core/TablePagination";
import CircularProgress from "@material-ui/core/CircularProgress";
import Error from "./Error";
import {fetchData} from "../helpers/utility";
import theme from "../themes/theme";
import {tableIcons} from "../constants/consts";


const useStyles = makeStyles((theme) => ({
  root: {
    flexShrink: 0,
    marginTop: theme.spacing(2)
  },
  errorContainer: {
    marginTop: theme.spacing(2)
  },
  overlayContainer: {
    display: "table",
    width: "100%",
    height: "100%",
    background: "rgb(255 255 255 / 70%)"
  },
  overlayElement: {
    display: "table-cell",
    width: "100%",
    height: "100%",
    verticalAlign: "middle",
    textAlign: "center"
  },
  paginationRoot: {
    minHeight: theme.spacing(3),
    display: "block",
    float: "right",
    overflowX: "auto"
  },
  paginationToolbar: {
    paddingLeft: theme.spacing(2)
  },
  paginationActions: {
    color: theme.palette.primary.main
  }
}));

export default function HistoryTable(props) {
  const classes = useStyles();
  const [errorMessage, setErrorMessage] = React.useState("");
  const errorStyle = { display: errorMessage ? "block" : "none" };
  const [data, setData] = React.useState(props.data);
  const customOptions = props.options? props.options: {};
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 5));
    setPage(0);
  };
  return (
    <React.Fragment>
      <div className={classes.root}>
        <MaterialTable
          className="history"
          columns={props.columns}
          data={data}
          options={{...{
            padding: "dense",
            emptyRowsWhenPaging: false,
            toolbar: false,
            filtering: false,
            sorting: true,
            search: false,
            showTitle: false,
            pageSizeOptions: [5],
            headerStyle: {
              backgroundColor: "#f3f9f9",
              paddingTop: theme.spacing(0.5),
              paddingBottom: theme.spacing(0.5)
            },
            actionsCellStyle: {
              paddingLeft: theme.spacing(2),
              paddingRight: theme.spacing(2),
              justifyContent: "center"
            },
            actionsColumnIndex: -1,
          },...customOptions}}
          icons={tableIcons}
          loadingType="linear"
          localization={{
            header: {
              actions: "",
            },
            body: {
              deleteTooltip: "Remove record",
              editRow: {
                deleteText:
                  "Are you sure you want to remove this record?",
                saveTooltip: "OK",
              },
            },
            pagination: {
              labelRowsSelect: "records",
              labelRowsPerPage: "Records per page"
            }
          }}
          //overlay
          components={{
            OverlayLoading: () => (
                <div className={classes.overlayContainer}>
                    <div className={classes.overlayElement}>
                      <CircularProgress></CircularProgress>
                    </div>
                </div>
            ),
            Pagination: parentProps => (
              <TablePagination
                count={data.length}
                page={page}
                onPageChange={(e,page) => {
                  handleChangePage(e,page);
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
                classes={
                  {
                    root: classes.paginationRoot,
                    actions: classes.paginationActions,
                    toolbar: classes.paginationToolbar
                  }
                }
                labelRowsPerPage="Records per page:"
              />
            )
          }}
          editable={{
            onRowUpdate: (newData, oldData) => {
                  return fetchData(props.APIURL + oldData.id, {
                    "method": "PUT",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"},
                        cache: "no-cache",
                        body: JSON.stringify(
                          props.submitDataFormatter ? props.submitDataFormatter(newData) : newData
                        )
                    }).then(() => {
                      const dataUpdate = [...data];
                      // In dataUpdate, find target
                      const target = dataUpdate.find(
                        (el) => el.id === oldData.id
                      );
                      const index = dataUpdate.indexOf(target);
                      dataUpdate[index] = newData;
                      setData([...dataUpdate]);
                      if (props.onRowUpdate)
                        setTimeout(
                          () => props.onRowUpdate(),
                          350
                        );
                    }).catch((e) => {
                      setErrorMessage(
                        "Unable to update patient from the list." + e
                      );
                    });
                  },
              onRowDelete: oldData =>
                  fetchData(props.APIURL + oldData.id, { method: "DELETE" })
                        .then(() => {
                            const dataDelete = [...data];
                            const target = dataDelete.find(
                              (el) => el.id === oldData.id
                            );
                            const index = dataDelete.indexOf(target);
                            dataDelete.splice(index, 1);
                            setData([...dataDelete]);
                            setErrorMessage("");
                            if (props.onRowDelete) setTimeout(() => props.onRowDelete(), 350);
                        })
                        .catch((e) => {
                          setErrorMessage(
                            "Unable to remove patient from the list. " + e
                          );
                        }),
          }}
        />
      </div>
      <div className={classes.errorContainer}><Error message={errorMessage} style={errorStyle} /></div>
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
    options: PropTypes.object
};
