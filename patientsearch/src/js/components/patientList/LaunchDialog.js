import React, { memo, useCallback } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogBox from "../DialogBox";
import { usePatientDataContext } from "../../context/PatientListContextProvider";
import { useCurrentRow, useLaunchDialogState } from "../../stores/patientListSelectors";
import { usePatientListStore } from "../../stores/patientListStore";
import { isEmptyArray } from "../../helpers/utility";

const LaunchDialogBox = memo(function LaunchDialogBox({
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
        <Box className="flex-center flex-gap-1">
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
  const { appClients, handleLaunchApp = noop } = usePatientDataContext();
  const currentRow = useCurrentRow();
  const getTitle = useCallback(() => currentRow
    ? `Launch application for ${currentRow.last_name}, ${currentRow.first_name}`
    : "Launch Application", [currentRow]);
  const openDialog = useLaunchDialogState();

  if (!currentRow) return null;

  return (
    <MemoizedLaunchDialogBox
      open={openDialog}
      title={getTitle()}
      appClients={appClients}
      launchFunc={handleLaunchApp}
      rowData={currentRow}
      onCloseFunc={closeLaunchInfoModal}
    />
  );
}
