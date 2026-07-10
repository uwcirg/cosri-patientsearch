import { memo } from "react";
import PropTypes from "prop-types";

const MemoizedOverlayElement = memo(function MemoizedOverlayElement(props) {
  const classes = {
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
  };
  return (
    <div style={classes.overlayContainer}>
      <div style={classes.overlayElement}>{props.children}</div>
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
