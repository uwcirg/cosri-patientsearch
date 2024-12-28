import React from "react";
import PropTypes from "prop-types";
import makeStyles from '@mui/styles/makeStyles';
import Alert from "./Alert";

const useStyles = makeStyles((theme) => ({
  root: {
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
  },
}));

export default function ErrorMessage(props) {
  if (!props.message) return null;
  const classes = useStyles();
  return (
    <div
      className={classes.root}
      style={{ ...props.style}}
    >
      <Alert severity="error" message={props.message}></Alert>
    </div>
  );
}

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired,
  style: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};
