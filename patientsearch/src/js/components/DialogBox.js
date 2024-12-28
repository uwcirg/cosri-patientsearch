import React from "react";
import PropTypes from "prop-types";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import makeStyles from '@mui/styles/makeStyles';

const useStyles = makeStyles((theme) => ({
  diaglogTitle: {
    backgroundColor: theme.palette.primary.lightest,
  },
  diaglogContent: {
    marginTop: theme.spacing(3),
  },
}));

export default function DialogBox(props) {
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    const handleClose = () => {
        setOpen(false);
        if (props.onClose) props.onClose();
    };
    React.useEffect(() => {
        setOpen(props.open);
    }, [props.open]);
    return (
      <Dialog open={open} onClose={handleClose} aria-labelledby="dialog-title">
        <DialogTitle
          classes={{
            root: classes.diaglogTitle,
          }}
        >
          {props.title}
        </DialogTitle>
        <DialogContent
          classes={{
            root: classes.diaglogContent,
          }}
        >
          {props.body}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
}

DialogBox.propTypes = {
    open: PropTypes.bool,
    title: PropTypes.string,
    body: PropTypes.element,
    onClose: PropTypes.func
};
