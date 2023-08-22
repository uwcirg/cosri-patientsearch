import { Button } from "@material-ui/core";
import useStyles from "../../../styles/patientListStyle";
import DialogBox from "../DialogBox";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function LaunchDialog() {
  const classes = useStyles();
  let {
    //consts
    appClients,
    currentRow,
    openLaunchInfoModal,
    //methods
    handleLaunchApp,
    hasSoFClients,
    onLaunchDialogClose,
  } = usePatientListContext();
  if (!handleLaunchApp)
    handleLaunchApp = function () {
      console.log("handleLaunchApp is not defined.  Unable to launch app.");
    };
  if (!hasSoFClients)
    hasSoFClients = function () {
      console.log("hasSoFClients is not defined. Unable to check.");
    };
  if (!onLaunchDialogClose) onLaunchDialogClose = function () {};
  return (
    <DialogBox
      open={openLaunchInfoModal}
      onClose={() => onLaunchDialogClose()}
      title={
        currentRow ? `${currentRow.last_name}, ${currentRow.first_name}` : ""
      }
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
