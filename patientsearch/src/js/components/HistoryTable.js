import PropTypes from 'prop-types';
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import MaterialTable from "material-table";
import CircularProgress from "@material-ui/core/CircularProgress";
import Error from "./Error";
import {fetchData} from "./Utility";
import theme from "../context/theme";
import {tableIcons} from "../context/consts";


const useStyles = makeStyles((theme) => ({
  root: {
    flexShrink: 0,
    marginTop: theme.spacing(3)
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
}));

export default function HistoryTable(props) {
  const classes = useStyles();
  const [errorMessage, setErrorMessage] = React.useState("");
  const errorStyle = { display: errorMessage ? "block" : "none" };
  const [data, setData] = React.useState(props.data);
  const customOptions = props.options? props.options: {};
  return (
    <React.Fragment>
      <div className={classes.root}>
        <MaterialTable
          className="history"
          columns={props.columns}
          data={data}
          options={{...{
            paginationTypestepped: "stepped",
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
              minWidth: "25%",
              justifyContent: "center",
            },
            actionsColumnIndex: -1,
          },...customOptions}}
          icons={tableIcons}
          loadingType="linear"
          localization={{
            header: {
              actions: "",
            },
            pagination: {
              labelRowsSelect: "rows",
            },
            body: {
              deleteTooltip: "Remove from the list",
              editRow: {
                deleteText:
                  "Are you sure you want to remove this record?",
                saveTooltip: "OK",
              },
            },
          }}
          //overlay
          components={{
            OverlayLoading: () => (
                <div className={classes.overlayContainer}>
                    <div className={classes.overlayElement}>
                      <CircularProgress></CircularProgress>
                    </div>
                </div>
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
                          const index = oldData.tableData.id;
                          dataUpdate[index] = newData;
                          setData([...dataUpdate]);
                          if (props.onRowUpdate) setTimeout(() => props.onRowUpdate(), 250);
                    }).catch(() => {
                      setErrorMessage(
                        "Unable to update patient from the list."
                      );
                    });
                  },
              onRowDelete: oldData =>
                  fetchData(props.APIURL + oldData.id, { method: "DELETE" })
                        .then(() => {
                            const dataDelete = [...data];
                            const index = oldData.tableData.id;
                            dataDelete.splice(index, 1);
                            setData([...dataDelete]);
                            setErrorMessage("");
                            if (props.onRowDelete) setTimeout(() => props.onRowDelete(), 250);
                        })
                        .catch(() => {
                          setErrorMessage(
                            "Unable to remove patient from the list."
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
