import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import CircularProgress from "@mui/material/CircularProgress";
import Modal from "@mui/material/Modal";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  flex: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    width: "250px",
    backgroundColor: "#FFF",
    position: "relative",
    top: "40%",
    border: `1px solid ${theme.palette.primary.main}`,
    margin: "auto",
    padding: theme.spacing(2),
    fontSize: "1.1rem",
  },
  loadingText: {
    display: "inline-block",
    marginRight: theme.spacing(1.5),
  },
}));

export default function LoadingModal({ open = false }) {
  const classes = useStyles();
  const [openModal, setOpenModal] = useState(open);

  useEffect(() => {
    setOpenModal(open);
  }, [open]);

  return (
    <Modal
      open={openModal}
      aria-labelledby="loading-modal-label"
      aria-describedby="loading-modal-description"
      disableAutoFocus
      disableEnforceFocus
    >
      <div className={classes.flex}>
        <span id="loading-modal-label" className={classes.loadingText}>
          Loading ...
        </span>
        <span id="loading-modal-description" style={{ display: "none" }}>
          Content is loading, please wait.
        </span>
        <CircularProgress color="primary" />
      </div>
    </Modal>
  );
}

LoadingModal.propTypes = {
  open: PropTypes.bool,
};
