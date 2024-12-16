import React from "react";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import { usePatientListContext } from "../../context/PatientListContextProvider";

const useStyles = makeStyles((theme) => ({
  detailPanelWrapper: {
    backgroundColor: "#dde7e6",
    padding: theme.spacing(0.25),
  },
  detailPanelContainer: {
    position: "relative",
    minHeight: theme.spacing(8),
    backgroundColor: "#fbfbfb",
  },
  detailPanelCloseButton: {
    position: "absolute",
    top: theme.spacing(1.5),
    right: theme.spacing(6),
    color: theme.palette.primary.main,
  },
}));

export default function DetailPanel({ data }) {
  const classes = useStyles();
  let {
    getDetailPanelContent = function () {},
    onDetailPanelClose = function () {},
  } = usePatientListContext();

  return (
    <div className={classes.detailPanelWrapper}>
      <Paper
        elevation={1}
        variant="outlined"
        className={classes.detailPanelContainer}
      >
        {getDetailPanelContent(data)}
        <Button
          onClick={() => {
            onDetailPanelClose(data);
          }}
          className={classes.detailPanelCloseButton}
          size="small"
        >
          Close X
        </Button>
      </Paper>
    </div>
  );
}

DetailPanel.propTypes = {
  data: PropTypes.object.isRequired,
};
