import React, { memo, forwardRef, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import makeStyles from "@mui/styles/makeStyles";
import { usePatientListContext } from "../../context/PatientListContextProvider";

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

const noop = () => {};
const DetailPanelContent = memo(
  forwardRef(function DetailPanelContent(
    { content, onClickFunc, classes },
    ref,
  ) {
    return (
      <div className={classes.detailPanelWrapper} ref={ref}>
        <Paper elevation={1} className={classes.detailPanelContainer}>
          {content}
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
  content: PropTypes.element,
};

export default function DetailPanel({ data, content }) {
  const panelRef = useRef();
  const classes = useStyles();

  const { childrenProps = {} } = usePatientListContext();
  const {
    currentRow,
    onDetailPanelClose = noop,
  } = childrenProps["detailPanel"] ?? {};

  const handleClose = useCallback(
    () => onDetailPanelClose(data),
    [onDetailPanelClose, data],
  );

  useEffect(() => {
    if (!panelRef.current) return;

    const panelTR = panelRef.current.closest("tr");
    const previousTr = panelTR?.previousElementSibling;
    const dataRowId = data?.rowData?.id;
    if (currentRow && currentRow.id === dataRowId) {
      previousTr.classList.add("selected-row");
    }
    if (!previousTr) return;
    previousTr.classList.remove("selected-row");
  }, [data, currentRow]);

  return (
    <DetailPanelContent
      ref={panelRef}
      content={content}
      onClickFunc={handleClose}
      classes={classes}
    />
  );
}

DetailPanel.propTypes = {
  data: PropTypes.object.isRequired,
  content: PropTypes.element,
};
