import React from "react";
import Modal from "@material-ui/core/Modal";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import { Alert } from "@material-ui/lab";
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
    left: "calc(50% - 240px)",
  },
  buttonsContainer: {
    padding: theme.spacing(2),
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing(1),
  },
}));

export default function ReactivatingModal() {
  const classes = useStyles();
  let {
    //consts
    getAppSettingByKey,
    openReactivatingModal,
    currentRow,
    handleSearch,
  } = usePatientListContext();

  const [open, setOpen] = React.useState(openReactivatingModal);

  const onReactivate = () => {
    handleSearch({
      ...getSubjectDataFromFilters(),
      active: true,
    });
    setOpen(false);
  };
  const onClose = (event, reason) => {
    if (reason && reason === "backdropClick") 
        return;
    setOpen(false);
    setTimeout(() => window.location.reload(), 0);
  };
  const getSubjectReferenceText = () =>
    String(getAppSettingByKey("MY_PATIENTS_FILTER_LABEL"))
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
    setOpen(openReactivatingModal);
  }, [openReactivatingModal]);

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
          restore that record?
        </Alert>
        {/* TODO: implement create new */}
        {/* Note, need to consider implication where there are multiple patient records of the same name and dob, which one to reactivate if there are multiple inactive ones? */}
        <div className={classes.buttonsContainer}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={onReactivate}
          >
            Restore
          </Button>
          <Button variant="outlined" color="primary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Box>
    </Modal>
  );
}
