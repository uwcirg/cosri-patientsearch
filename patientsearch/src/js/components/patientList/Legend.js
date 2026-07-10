import { memo } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import {useContainNoPMPRow} from "../../stores/patientListSelectors";

const LegendContent = memo(function LegendContent({ show, classes }) {
  if (show)
    return (
      <Box sx={classes.legend}>
        <span style={classes.legendIcon}></span> Not in PMP
      </Box>
    );
  return <Box sx={classes.spacer}></Box>;
});

LegendContent.propTypes = {
  show: PropTypes.bool,
  classes: PropTypes.object,
};

export default function Legend() {
  const shouldShowLegend = useContainNoPMPRow();
  const theme = useTheme();
  const classes = {
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
  };
  return (
    <LegendContent show={shouldShowLegend} classes={classes}></LegendContent>
  );
}

Legend.propTypes = {
  show: PropTypes.bool,
};
