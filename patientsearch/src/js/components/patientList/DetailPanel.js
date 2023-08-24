import React from "react";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import useStyles from "../../../styles/patientListStyle";
import { usePatientListContext } from "../../context/PatientListContextProvider";

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
