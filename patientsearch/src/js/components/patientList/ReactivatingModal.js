import React from "react";
import Modal from "@mui/material/Modal";
import makeStyles from "@mui/styles/makeStyles";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { Alert } from "@mui/material";
import { usePatientListContext } from "../../context/PatientListContextProvider";
import RowData from "../../models/RowData";

const useStyles = makeStyles((theme) => ({
  container: {
    backgroundColor: "#FFF",
    margin: "auto",
    padding: theme.spacing(1),
    position: "absolute",
    top: "25%",
    width: "480px",
    left: "calc(50% - 240px)",
  },
  buttonsContainer: {
    padding: theme.spacing(2, 2, 1),
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing(1),
  },
}));

export default function ReactivatingModal() {
  const classes = useStyles();

  let {
    reactivateProps = {}
  } = usePatientListContext();

  const [open, setOpen] = React.useState(false);
  const {
    onSubmit,
    onModalClose,
    currentRow,
    patientLabel,
    modalOpen,
    handleSearch,
  } = reactivateProps;

  const onAfterButtonClick = () => {
    setOpen(false);
    onSubmit();
  };

  const onReactivate = () => {
    handleSearch(getSubjectDataFromFilters(), {
      reactivate: true,
    });
    onAfterButtonClick();
  };
  const onCreate = () => {
    handleSearch(getSubjectDataFromFilters(), {
      createNew: true,
    });
    onAfterButtonClick();
  };
  const onClose = (event, reason) => {
    if (reason && reason === "backdropClick") return;
    onAfterButtonClick();
    onModalClose();
  };
  const getSubjectReferenceText = () =>
    String(patientLabel)
      .toLowerCase()
      .includes("recipient")
      ? "recipient"
      : "patient";
  const getSubjectDataFromFilters = () => {
    const oData = new RowData(currentRow);
    return oData.data;
  };
  const getSubjectInfoFromFilters = () => {
    const oData = new RowData(currentRow);
    if (!oData.lastName || !oData.lastName) return "patient";
    const name = [oData.lastName, oData.firstName].join(", ");
    const dob = oData.birthDate ? oData.birthDate : "";
    return [name, dob].join(" ");
  };

  React.useEffect(() => {
    setOpen(modalOpen);
  }, [modalOpen]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="reactivating-modal"
      aria-describedby="reactivating-modal"
    >
      <Box className={classes.container}>
        <Alert severity="warning">
          There is a deactivated {getSubjectReferenceText()} record in the
          system that matches this name and birthdate ({" "}
          <strong>{getSubjectInfoFromFilters()}</strong> ). Do you want to
          restore that record or create a new one?
        </Alert>
        <div className={classes.buttonsContainer}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={onReactivate}
          >
            Restore
          </Button>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={onCreate}
          >
            Create New
          </Button>
          <Button variant="outlined" color="primary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Box>
    </Modal>
  );
}
