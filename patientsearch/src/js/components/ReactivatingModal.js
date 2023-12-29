import React from "react";
import PropTypes from "prop-types";
import Modal from "@material-ui/core/Modal";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import { usePatientListContext } from "../../context/PatientListContextProvider";

const useStyles = makeStyles((theme) => ({
  flex: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    width: "400px",
    backgroundColor: "#FFF",
    position: "relative",
    top: "40%",
    border: `1px solid ${theme.palette.primary.main}`,
    margin: "auto",
    padding: theme.spacing(2),
    fontSize: "1.1rem"
  },
  loadingText: {
    display: "block",
    marginBottom: theme.spacing(2),
  },
  buttonContainer: {
    marginTop: theme.spacing(2),
  },
  button: {
    marginRight: theme.spacing(2),
  },
}));

export default function ConfirmationModal(props) {
  const classes = useStyles();
  let {
    //consts
    openReactivatingModal,
    //methods
    hasSoFClients = function () {
      console.log("hasSoFClients is not defined. Unable to check.");
      return false;
    },
    onReactivatingModalClose = function () {},
  } = usePatientListContext();

  // const onRecreateClick = (createNew) => {
  //   onCreateNewClick(createNew); // Inform the parent that the user does not want to create a new object
  //   onClose(); // Close the modal
  // };

  return (
    <Modal
      open={openReactivatingModal}
      onClose={() => onReactivatingModalClose()}
      aria-labelledby="confirmation-modal"
      aria-describedby="confirmation-modal"
      disableAutoFocus
      disableEnforceFocus
    >
      <div className={classes.flex}>
        <span className={classes.loadingText}>
          There is a deactivated patient record in the system that matches this name and birthdate.
          Do you want to restore that record, or create a new one?
        </span>
        <div className={classes.buttonContainer}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() => onRecreateClick(false)}
          >
            Restore
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => onRecreateClick(true)}
          >
            Create New
          </Button>
        </div>
      </div>
    </Modal>
  );
}

ConfirmationModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onCreateNewClick: PropTypes.func.isRequired,
};
