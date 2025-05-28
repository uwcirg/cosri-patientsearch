import { memo } from "react";
import PropTypes from "prop-types";
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

const LaunchDialogBox = memo(function LaunchDialogBox({
  classes,
  appClients,
  launchFunc,
  onCloseFunc,
  open,
  title,
}) {
  return (
    <DialogBox
      open={open}
      onClose={onCloseFunc}
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
                    launchFunc(appClient);
                  }}
                >{`Launch ${appClient.id}`}</Button>
              );
            })}
        </div>
      }
    ></DialogBox>
  );
});

LaunchDialogBox.propTypes = {
  classes: PropTypes.object,
  open: PropTypes.bool,
  title: PropTypes.string,
  appClients: PropTypes.array,
  launchFunc: PropTypes.func,
  onCloseFunc: PropTypes.func,
};

export default function LaunchDialog() {
  const classes = useStyles();
  let { childrenProps = {} } = usePatientListContext();
  const {
    title,
    appClients,
    onLaunchDialogClose = function () {},
    handleLaunchApp = function () {},
    open,
  } = childrenProps["launchDialog"] ?? {};

  return (
    <LaunchDialogBox
      classes={classes}
      open={open}
      title={title}
      appClients={appClients}
      launchFunc={handleLaunchApp}
      onCloseFunc={() => onLaunchDialogClose()}
    ></LaunchDialogBox>
  );
}
