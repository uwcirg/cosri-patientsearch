import React, {
  memo,
  forwardRef,
  useRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import {
  usePatientListStore,
  patientListStoreApi,
} from "../../stores/patientListStore";
import { usePatientDataContext } from "../../context/PatientListContextProvider";
import { defaultMenuItems } from "../../constants/consts";
import { toggleDetailPanel } from "../../helpers/utility";

const getSelectedItemComponent = (key, rowData) => {
  if (!key) return null;
  const item = defaultMenuItems.find(
    (i) => String(i.id).toLowerCase() === String(key).toLowerCase(),
  );
  return item ? item.component(rowData) : null;
};

const getDetailPanelContent = (d, selectedItemId) =>
  getSelectedItemComponent(selectedItemId, d?.rowData);

const DetailPanelContent = memo(
  forwardRef(function DetailPanelContent(
    { onClickFunc, selectedItemId, data },
    ref,
  ) {
    return (
      <Box className="detailPanel__wrapper" ref={ref}>
        <Paper elevation={1} className="detailPanel__container">
          {getDetailPanelContent(data, selectedItemId)}
          <Button
            onClick={onClickFunc}
            className="close-button"
            size="small"
          >
            Close X
          </Button>
        </Paper>
      </Box>
    );
  }),
);

DetailPanelContent.propTypes = {
  onClickFunc: PropTypes.func,
  data: PropTypes.object.isRequired,
  selectedItemId: PropTypes.string,
};

export default function DetailPanel({ data }) {
  const { tableRef } = usePatientDataContext();
  const cloneTableRef = useRef(null);
  const panelRef = useRef();
  const { closeMenu, selectedMenuItem } = patientListStoreApi.getState();
  const [selectedItemId, setSelectedItemId] = useState(selectedMenuItem);

  useEffect(() => {
    const unsubscribe = usePatientListStore.subscribe(
      (state) => state.selectedMenuItem,
      (selectedMenuItem, prevMenuItem) => {
        if (prevMenuItem !== selectedMenuItem)
          setSelectedItemId(selectedMenuItem ?? null);
      },
    );
    return unsubscribe;
  }, []);
  useEffect(() => {
    if (!tableRef?.current) return;
    if (cloneTableRef.current) return;
    cloneTableRef.current = tableRef.current;
  }, [tableRef]);

  const handleClose = useCallback(() => {
    toggleDetailPanel(cloneTableRef?.current, data?.rowData);
    closeMenu();
  }, [closeMenu, data]);

  return (
    <DetailPanelContent
      ref={panelRef}
      onClickFunc={handleClose}
      selectedItemId={selectedItemId}
      data={data}
    />
  );
}

DetailPanel.propTypes = {
  data: PropTypes.object.isRequired,
};
