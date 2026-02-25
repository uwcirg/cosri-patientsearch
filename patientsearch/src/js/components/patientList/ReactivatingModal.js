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

function warnIfMissing(name, fn) {
  if (process.env.NODE_ENV === "development" && typeof fn !== "function") {
    console.warn(
      `ReactivatingModal: expected a function for "${name}" but received`,
      fn,
    );
  }
  return typeof fn === "function" ? fn : () => {};
}

export default function ReactivatingModal() {
  const classes = useStyles();
  const { childrenProps = {} } = usePatientListContext();
  const [open, setOpen] = React.useState(false);

  const {
    onSubmit,
    onModalClose,
    currentRow,
    patientLabel,
    modalOpen,
    handleSearch,
  } = childrenProps["reactivate"] ?? {};

  const safeOnSubmit = warnIfMissing("onSubmit", onSubmit);
  const safeOnModalClose = warnIfMissing("onModalClose", onModalClose);
  const safeHandleSearch = warnIfMissing("handleSearch", handleSearch);
  const rowData = React.useMemo(() => new RowData(currentRow), [currentRow]);

  const getSubjectReferenceText = () =>
    String(patientLabel).toLowerCase().includes("recipient")
      ? "recipient"
      : "patient";

  const getSubjectData = () => rowData.data;

  const getSubjectInfo = () => {
    if (!rowData.lastName || !rowData.firstName) return "patient";
    const name = [rowData.lastName, rowData.firstName].join(", ");
    const dob = rowData.birthDate ?? "";
    return [name, dob].join(" ");
  };

  const handleAction = (mode) => {
    safeHandleSearch(getSubjectData(), { [mode]: true });
    safeOnSubmit();
    setOpen(false);
  };

  const onReactivate = () => handleAction("reactivate");
  const onCreate = () => handleAction("createNew");

  const onClose = (event, reason) => {
    if (reason === "backdropClick") return;
    safeOnModalClose();
  };

  React.useEffect(() => {
    setOpen(modalOpen);
  }, [modalOpen]);

  return (
    <Modal
      open={!!open}
      onClose={onClose}
      aria-labelledby="reactivating-modal-title"
      aria-describedby="reactivating-modal-description"
    >
      <Box className={classes.container}>
        <Alert severity="warning" id="reactivating-modal-description">
          <strong id="reactivating-modal-title">Duplicate Record Found</strong>
          <br />
          There is a deactivated {getSubjectReferenceText()} record in the
          system that matches this name and birthdate ({" "}
          <strong>{getSubjectInfo()}</strong> ). Do you want to restore that
          record or create a new one?
        </Alert>
        <div className={classes.buttonsContainer}>
          <Button variant="contained" color="primary" onClick={onReactivate}>
            Restore
          </Button>
          <Button variant="contained" color="primary" onClick={onCreate}>
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
