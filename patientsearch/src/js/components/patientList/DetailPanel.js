import React, {
  memo,
  forwardRef,
  useRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import PropTypes from "prop-types";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import makeStyles from "@mui/styles/makeStyles";
import { usePatientListStore } from "../../stores/patientListStore";
import { useAppContext } from "../../context/PatientListContextProvider";
import { defaultMenuItems } from "../../constants/consts";
import { toggleDetailPanel } from "../../helpers/utility";

const useStyles = makeStyles((theme) => ({
  detailPanelWrapper: {
    backgroundColor: "#dde7e6",
    padding: theme.spacing(0.25),
  },
  detailPanelContainer: {
    position: "relative",
    minHeight: theme.spacing(8),
    backgroundColor: "#fbfbfb",
  },
  detailPanelCloseButton: {
    position: "absolute",
    top: theme.spacing(1.5),
    right: theme.spacing(6),
    color: theme.palette.primary.main,
  },
}));

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
    { onClickFunc, selectedItemId, data, classes },
    ref,
  ) {
    return (
      <div className={classes.detailPanelWrapper} ref={ref}>
        <Paper elevation={1} className={classes.detailPanelContainer}>
          {getDetailPanelContent(data, selectedItemId)}
          <Button
            onClick={onClickFunc}
            className={classes.detailPanelCloseButton}
            size="small"
          >
            Close X
          </Button>
        </Paper>
      </div>
    );
  }),
);

DetailPanelContent.propTypes = {
  onClickFunc: PropTypes.func,
  classes: PropTypes.object.isRequired,
  data: PropTypes.object.isRequired,
  selectedItemId: PropTypes.string,
};


export default function DetailPanel({ data }) {
  const { tableRef } = useAppContext();
  const cloneTableRef = useRef(null);
  const panelRef = useRef();
  const classes = useStyles();
  const { closeMenu, selectedMenuItem } = usePatientListStore.getState();
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
      classes={classes}
      selectedItemId={selectedItemId}
      data={data}
    />
  );
}

DetailPanel.propTypes = {
  data: PropTypes.object.isRequired,
};
