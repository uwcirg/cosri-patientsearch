import { memo } from "react";
import PropTypes from "prop-types";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  legend: {
    marginTop: theme.spacing(2.5),
  },
  legendIcon: {
    backgroundColor: theme.palette.dark.disabled,
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

const LegendContent = memo(function LegendContent({ show, classes }) {
  if (show)
    return (
      <div className={classes.legend}>
        <span className={classes.legendIcon}></span> Not in PMP
      </div>
    );
  return <div className={classes.spacer}></div>;
});

LegendContent.propTypes = {
  show: PropTypes.bool,
  classes: PropTypes.object,
};
export default function Legend({ show }) {
  const classes = useStyles();
  return <LegendContent show={show} classes={classes}></LegendContent>;
}

Legend.propTypes = {
  show: PropTypes.bool,
};
