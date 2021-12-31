import React from "react";

const Spinner = () => {
  return (
    <div className="spinner" role="img" aria-label="Loading">
      <div className="bounceContainer">
        <div className="bounce1"></div>
        <div className="bounce2"></div>
        <div className="bounce3"></div>
      </div>
    </div>
  );
};

export default Spinner;
