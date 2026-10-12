import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

/**
 * Translucent overlay with a spinner. The parent must be position: relative.
 */
export default function ProgressOverlay({ sx }) {
  return (
    <Box
      sx={[
        (theme) => ({
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          background: "hsl(0deg 0% 100% / 80%)",
          zIndex: 500,
          minHeight: theme.spacing(6),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <CircularProgress
        color="primary"
        size={32}
        sx={{ position: "absolute", top: "15%", left: "15%" }}
      />
    </Box>
  );
}

ProgressOverlay.propTypes = {
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};
