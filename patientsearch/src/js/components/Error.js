import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Alert from "./Alert";


export default function ErrorMessage(props) {
  const theme = useTheme();
  if (!props.message) return null;
  return (
    <Box
      sx={{
        marginBottom: theme.spacing(3),
        width: "100%",
        "& > * + *": {
          marginTop: theme.spacing(2),
          marginBottom: theme.spacing(2),
        },
        "& ul": {
          padding: theme.spacing(0, 2, 0),
          margin: theme.spacing(1, 0, 1),
        },
        ...props.style
      }}
    >
      <Alert severity="error" message={props.message}></Alert>
    </Box>
  );
}

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
  style: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};
