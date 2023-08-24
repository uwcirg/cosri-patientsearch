import useStyles from "../../../styles/patientListStyle";
import PropTypes from "prop-types";

export default function Legend({ show }) {
  const classes = useStyles();
  if (show)
    return (
      <div className={classes.legend}>
        <span className={classes.legendIcon}></span> Not in PMP
      </div>
    );
  return <div className={classes.spacer}></div>;
}

Legend.propTypes = {
  show: PropTypes.bool,
};
