import React from "react";
import PropTypes from "prop-types";
import Snackbar from "@mui/material/Snackbar";
import Alert from "./Alert";

/**
 * "Request processed successfully." toast 
 */
export default function SuccessSnackbar({
  open,
  onClose,
  message = "Request processed successfully.",
}) {
  const handleClose = (event, reason) => {
    if (event && event.stopPropagation) event.stopPropagation();
    if (reason === "clickaway") return;
    onClose();
  };
  return (
    <Snackbar open={open} autoHideDuration={2000} onClose={handleClose}>
      <div>
        <Alert onClose={handleClose} severity="success" message={message} />
      </div>
    </Snackbar>
  );
}

SuccessSnackbar.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.string,
};
