import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
// import renderHTML from "react-render-html";
import MuiAlert from '@mui/material/Alert';

export default function Alert(props) {
  const variant = props.variant ? props.variant : "filled";
  const severity = props.severity ? props.severity : "error";
  const elevation =
    props.elevation || props.elevation === 0 ? props.elevation : 6;
  const message =
    typeof DOMPurify !== "undefined" && typeof DOMPurify.sanitize === "function"
      ? DOMPurify.sanitize(props.message)
      : props.message;
  const renderHTML = (message) => <div dangerouslySetInnerHTML={{__html: message}}></div>;
  return (
    <MuiAlert
      elevation={elevation}
      variant={variant}
      severity={severity}
      onClose={props.onClose}
      sx={props.sx}
    >
      {props.message && renderHTML(message)}
    </MuiAlert>
  );
}

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  severity: PropTypes.string,
  variant: PropTypes.string,
  elevation: PropTypes.number,
  onClose: PropTypes.func,
  sx: PropTypes.object
};
