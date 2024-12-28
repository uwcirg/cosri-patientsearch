import { Button } from "@mui/material";
import makeStyles from '@mui/styles/makeStyles';
import DialogBox from "../DialogBox";
import { usePatientListContext } from "../../context/PatientListContextProvider";

const useStyles = makeStyles((theme) => ({
  flex: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  flexButton: {
    marginRight: theme.spacing(1),
  },
}));

export default function LaunchDialog() {
  const classes = useStyles();
  let {
    //consts
    appClients,
    currentRow,
    openLaunchInfoModal,
    //methods
    handleLaunchApp = function () {
      console.log("handleLaunchApp is not defined.  Unable to launch app.");
    },
    hasSoFClients = function () {
      console.log("hasSoFClients is not defined. Unable to check.");
      return false;
    },
    onLaunchDialogClose = function () {},
  } = usePatientListContext();
  return (
    <DialogBox
      open={openLaunchInfoModal}
      onClose={() => onLaunchDialogClose()}
      title={`${
        currentRow ? `${currentRow.last_name}, ${currentRow.first_name}` : ""
      }`}
      body={
        <div className={classes.flex}>
          {!hasSoFClients() && <div>No client application is defined.</div>}
          {hasSoFClients() &&
            appClients.map((appClient, index) => {
              return (
                <Button
                  key={`launchButton_${index}`}
                  color="primary"
                  variant="contained"
                  className={classes.flexButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchApp(currentRow, appClient);
                  }}
                >{`Launch ${appClient.id}`}</Button>
              );
            })}
        </div>
      }
    ></DialogBox>
  );
}
