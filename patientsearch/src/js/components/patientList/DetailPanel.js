import React, { memo, useRef, useEffect } from "react";
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

export default function DetailPanel({ data }) {
  const panelRef = useRef();
  const classes = useStyles();
  let { childrenProps = {} } = usePatientListContext();
  const {
    currentRow,
    getDetailPanelContent = function () {},
    onDetailPanelClose = function () {},
  } = childrenProps["detailPanel"] ?? {};

  const DetailPanelContent = memo(function DetailPanelContent({
    content,
    onClickFunc,
  }) {
    return (
      <div className={classes.detailPanelWrapper} ref={panelRef}>
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
  });

  DetailPanelContent.propTypes = {
    content: PropTypes.element,
    onClickFunc: PropTypes.func,
  };

  useEffect(() => {
    if (!panelRef.current) return;
    const panelTR = panelRef.current.closest("tr");
    const previousTr = panelTR?.previousElementSibling;
    if (!previousTr) return;
    const dataRowId = data?.rowData?.id;
    if (currentRow && currentRow.id === dataRowId) {
      previousTr.classList.add("selected-row");
    } else {
      previousTr.classList.remove("selected-row");
    }
  }, [data, currentRow]);

  return (
    <DetailPanelContent
      content={getDetailPanelContent(data)}
      onClickFunc={() => {
        onDetailPanelClose(data);
      }}
    ></DetailPanelContent>
  );
}

DetailPanel.propTypes = {
  data: PropTypes.object.isRequired,
};
