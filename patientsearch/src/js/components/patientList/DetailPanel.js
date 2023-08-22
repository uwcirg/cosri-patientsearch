import React from "react";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import useStyles from "../../../styles/patientListStyle";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function DetailPanel({ data }) {
  const classes = useStyles();
  let {
    selectedMenuItem,
    getSelectedItemComponent,
    handleMenuClose,
    handleToggleDetailPanel,
    shouldHideMoreMenu,
  } = usePatientListContext();
  if (!shouldHideMoreMenu)
    shouldHideMoreMenu = function () {
      return true;
    };
  if (!handleToggleDetailPanel)
    shouldHideMoreMenu = function () {
      return true;
    };
  if (!handleMenuClose)
    handleMenuClose = function () {
      return true;
    };
  if (!getSelectedItemComponent)
    getSelectedItemComponent = function () {
      return null;
    };
  if (shouldHideMoreMenu()) return false;
  return (
    <div className={classes.detailPanelWrapper}>
      <Paper
        elevation={1}
        variant="outlined"
        className={classes.detailPanelContainer}
      >
        {getSelectedItemComponent(selectedMenuItem, data.rowData)}
        <Button
          onClick={() => {
            handleToggleDetailPanel(data.rowData);
            handleMenuClose();
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
