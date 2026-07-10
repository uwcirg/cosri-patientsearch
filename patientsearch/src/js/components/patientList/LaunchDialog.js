import { memo, useCallback } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";
import DialogBox from "../DialogBox";
import { useAppContext } from "../../context/PatientListContextProvider";
import { useCurrentRow, useLaunchDialogState } from "../../stores/patientListSelectors";
import { usePatientListStore } from "../../stores/patientListStore";
import { isEmptyArray } from "../../helpers/utility";

const LaunchDialogBox = memo(function LaunchDialogBox({
  classes,
  appClients,
  launchFunc,
  onCloseFunc,
  open,
  rowData,
  title,
}) {
  return (
    <DialogBox
      open={open}
      onClose={onCloseFunc}
      title={title}
      body={
        <Box sx={classes.flex}>
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
                  sx={classes.flexButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    launchFunc(rowData, appClient);
                    if (onCloseFunc) onCloseFunc();
                  }}
                >{`Launch ${appClient.id}`}</Button>
              );
            })}
        </Box>
      }
    ></DialogBox>
  );
});

LaunchDialogBox.propTypes = {
  classes: PropTypes.object,
  open: PropTypes.bool,
  title: PropTypes.string,
  rowData: PropTypes.object,
  appClients: PropTypes.array,
  launchFunc: PropTypes.func,
  onCloseFunc: PropTypes.func,
};

const noop = () => {};

const MemoizedLaunchDialogBox = memo(function memoizedLaunchDialogBox(props) {
  return <LaunchDialogBox {...props} />;
});

const { closeLaunchInfoModal } = usePatientListStore.getState();

export default function LaunchDialog() {
  const theme = useTheme();
  const classes = {
    flex: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    flexButton: {
      marginRight: theme.spacing(1),
    },
  };
  const { appClients, handleLaunchApp = noop} = useAppContext();
  const currentRow = useCurrentRow();
  const getTitle = useCallback(() => currentRow
    ? `Launch application for ${currentRow.last_name}, ${currentRow.first_name}`
    : "Launch Application", [currentRow]);
  const openDialog = useLaunchDialogState();

  if (!currentRow) return null;

  return (
    <MemoizedLaunchDialogBox
      classes={classes}
      open={openDialog}
      title={getTitle()}
      appClients={appClients}
      launchFunc={handleLaunchApp}
      rowData={currentRow}
      onCloseFunc={closeLaunchInfoModal}
    />
  );
}
