import React from "react";
import { useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";


export default function DialogBox(props) {
    const theme = useTheme();
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
          sx={{
            root: {
              backgroundColor: theme.palette.primary.lightest,
            },
          }}
        >
          {props.title}
        </DialogTitle>
        <DialogContent
          sx={{
            root: {
              marginTop: theme.spacing(3),
            },
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
