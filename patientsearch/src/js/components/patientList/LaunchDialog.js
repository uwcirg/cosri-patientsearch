import { Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import DialogBox from "../DialogBox";
import { usePatientListContext } from "../../context/PatientListContextProvider";
import { isEmptyArray } from "../../helpers/utility";

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
  let { launchDialogProps = {} } = usePatientListContext();
  const { title, appClients, onLaunchDialogClose, handleLaunchApp, open } =
    launchDialogProps;
  return (
    <DialogBox
      open={open}
      onClose={() => onLaunchDialogClose()}
      title={title}
      body={
        <div className={classes.flex}>
          {isEmptyArray(appClients) && (
            <div>No client application is defined.</div>
          )}
          {!isEmptyArray(appClients) &&
            appClients.map((appClient, index) => {
              return (
                <Button
                  key={`launchButton_${index}`}
                  color="primary"
                  variant="contained"
                  className={classes.flexButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchApp(appClient);
                  }}
                >{`Launch ${appClient.id}`}</Button>
              );
            })}
        </div>
      }
    ></DialogBox>
  );
}
