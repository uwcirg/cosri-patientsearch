import React, { memo } from "react";
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
  const classes = useStyles();
  let { childrenProps = {} } = usePatientListContext();
  const {
    getDetailPanelContent = function () {},
    onDetailPanelClose = function () {},
  } = childrenProps["detailPanel"] ?? {};

  const DetailPanelContent = memo(function DetailPanelContent({
    content,
    onClickFunc,
  }) {
    return (
      <div className={classes.detailPanelWrapper}>
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
