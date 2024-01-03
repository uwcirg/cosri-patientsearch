import React from "react";
//import PropTypes from "prop-types";
import Modal from "@material-ui/core/Modal";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import { Alert } from '@material-ui/lab';
import { usePatientListContext } from "../../context/PatientListContextProvider";
import RowData from "../../models/RowData";

const useStyles = makeStyles((theme) => ({
    container: {
      backgroundColor: "#FFF",
      margin: "auto",
      padding: theme.spacing(2),
      position: "absolute",
      top: "25%",
      width: "480px",
      left: "calc(50% - 240px)"
    },
    buttonsContainer: {
      padding: theme.spacing(2),
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: theme.spacing(1)
    }
}));

export default function ReactivatingModal() {
  const classes = useStyles();
  let {
    //consts
    openReactivatingModal,
    currentRow,
    handleSearch
  } = usePatientListContext();

  const [open, setOpen] = React.useState(openReactivatingModal);

  const onReactivate = () => {
    handleSearch({
      ...getPatientDataFromFilters(),
      active: true
    })
    setOpen(false);
  };
  const onClose = () => {
    setOpen(false);
  };
  const getPatientDataFromFilters = () => {
    const oData = new RowData(currentRow);
    return oData.data;
  };
  const getPatientNameFromFilters = () => {
    const oData = new RowData(currentRow);
    if (!oData.lastName || !oData.lastName) return "patient";
    return [oData.lastName, oData.firstName].join(", ");
  };

  React.useEffect(() => {
    setOpen(openReactivatingModal);
  }, [openReactivatingModal])

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="reactivating-modal"
      aria-describedby="reactivating-modal"
    >
      <Box className={classes.container}>
        <Alert severity="warning">
          The account for <strong>{getPatientNameFromFilters()}</strong> was previously
          deactivated. Do you want to re-activate it?
        </Alert>
        <div className={classes.buttonsContainer}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={onReactivate}
          >
            Yes, Reactivate
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </Box>
    </Modal>
  );
}
