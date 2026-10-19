import React from "react";
import PropTypes from "prop-types";
import Typography from "@mui/material/Typography";

export default function SectionTitle({ children, sx }) {
  return (
    <Typography
      variant="caption"
      sx={[
        (theme) => ({
          display: "inline-block",
          fontWeight: 500,
          color: theme.palette.dark ? theme.palette.dark.main : "#444",
          borderBottom: `2px solid ${theme.palette.primary.lightest}`,
          marginBottom: theme.spacing(1),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Typography>
  );
}

SectionTitle.propTypes = {
  children: PropTypes.node.isRequired,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};
