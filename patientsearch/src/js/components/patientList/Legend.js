import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  legend: {
    marginTop: theme.spacing(2.5),
  },
  legendIcon: {
    backgroundColor: theme.palette.primary.disabled,
    width: theme.spacing(6),
    height: theme.spacing(3),
    marginRight: theme.spacing(0.5),
    display: "inline-block",
    verticalAlign: "bottom",
  },
  spacer: {
    minWidth: "20px",
    minHeight: "20px",
  },
}));
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
