import React from "react";
import PropTypes from "prop-types";
import CircularProgress from "@mui/material/CircularProgress";
import Modal from "@mui/material/Modal";
import makeStyles from '@mui/styles/makeStyles';

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
    fontSize: "1.1rem"
  },
  loadingText: {
    display: "inline-block",
    marginRight: theme.spacing(1.5),
  },
}));

export default function LoadingModal(props) {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    setOpen(props.open);
  }, [props.open]);
  return (
    <Modal
      open={open}
      aria-labelledby="loading-modal"
      aria-describedby="loading-modal"
      disableAutoFocus
      disableEnforceFocus
    >
      <div className={classes.flex}>
        <span className={classes.loadingText}>Loading ...</span>
        <CircularProgress color="primary" />
      </div>
    </Modal>
  );
}

LoadingModal.propTypes = {
  open: PropTypes.bool,
};
