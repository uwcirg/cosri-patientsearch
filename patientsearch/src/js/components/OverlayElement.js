import { memo } from "react";
import PropTypes from "prop-types";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles({
  overlayContainer: {
    display: "table",
    width: "100%",
    height: "100%",
    background: "rgb(255 255 255 / 70%)",
  },
  overlayElement: {
    display: "table-cell",
    width: "100%",
    height: "100%",
    verticalAlign: "middle",
    textAlign: "center",
  },
});

const MemoizedOverlayElement = memo(function MemoizedOverlayElement(props) {
  const classes = useStyles();
  return (
    <div className={classes.overlayContainer}>
      <div className={classes.overlayElement}>{props.children}</div>
    </div>
  );
});

MemoizedOverlayElement.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};

export default function OverlayElement(props) {
  return <MemoizedOverlayElement>{props.children}</MemoizedOverlayElement>;
}

OverlayElement.propTypes = {
    children: PropTypes.oneOfType([PropTypes.element, PropTypes.array])
};
