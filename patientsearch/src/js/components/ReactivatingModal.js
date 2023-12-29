import React from "react";
import PropTypes from "prop-types";
import Modal from "@material-ui/core/Modal";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";

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
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(props.open);
  }, [props.open]);

  const handleRestoreClick = () => {
    onCreateNewClick(false); // Inform the parent that the user does not want to create a new object
    onClose(); // Close the modal
  };

  const handleCreateNewClick = () => {
    onCreateNewClick(true); // Inform the parent that the user wants to create a new object
    onClose(); // Close the modal
  };

  return (
    <Modal
      open={open}
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
            onClick={handleRestoreClick}
          >
            Restore
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateNewClick}
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
