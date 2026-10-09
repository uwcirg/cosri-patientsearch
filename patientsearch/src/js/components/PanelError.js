import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Error from "./Error";

/** Error message block shown at the bottom of a history panel. */
export default function PanelError({ message }) {
  return (
    <Box sx={(theme) => ({ maxWidth: "100%", marginTop: theme.spacing(3) })}>
      {message && <Error message={message} />}
    </Box>
  );
}

PanelError.propTypes = {
  message: PropTypes.string,
};
