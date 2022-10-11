import React from "react";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { makeStyles } from "@material-ui/core/styles";
import theme from "../themes/theme";

const useStyles = makeStyles({
  diaglogTitle: {
    backgroundColor: theme.palette.primary.lightest,
  },
  diaglogContent: {
    marginTop: theme.spacing(3),
  },
});

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
