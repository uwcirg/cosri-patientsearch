import React, { memo } from "react";
import PropTypes from "prop-types";

const MemoizedOverlayElement = memo(function MemoizedOverlayElement(props) {
  return (
    <div className="overlay__container">
      <div className="overlay__element">{props.children}</div>
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
