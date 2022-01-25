import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import renderHTML from "react-render-html";
import MuiAlert from "@material-ui/lab/Alert";

export default function Alert(props) {
    const variant = props.variant?props.variant:"filled";
    const severity = props.severity?props.severity:"error";
  return <MuiAlert
            elevation={6}
            variant={variant}
            severity={severity}
            onClose={props.onClose}>
              {props.message && renderHTML(DOMPurify.sanitize(props.message))}
        </MuiAlert>;
}

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  severity: PropTypes.string,
  variant: PropTypes.string,
  onClose: PropTypes.func
};
