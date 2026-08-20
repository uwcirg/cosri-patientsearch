import { memo } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import {useContainNoPMPRow} from "../../stores/patientListSelectors";

const LegendContent = memo(function LegendContent({ show }) {
  if (show)
    return (
      <Box className="legend__container">
        <span className="legend__icon"></span> Not in PMP
      </Box>
    );
  return <Box className="spacer"></Box>;
});

LegendContent.propTypes = {
  show: PropTypes.bool,
};

export default function Legend() {
  const shouldShowLegend = useContainNoPMPRow();
  return (
    <LegendContent show={shouldShowLegend}></LegendContent>
  );
}

Legend.propTypes = {
  show: PropTypes.bool,
};
