import { memo } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import { Box, Button, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const refreshFunction = () => {
  location.reload();
};

const MemoizedRefreshButton = memo(function MemoizedRefreshButton(props) {
  return (
    <Box sx={props.containerClass}>
      <Tooltip title="Refresh the list">
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={refreshFunction}
        >
          Refresh
        </Button>
      </Tooltip>
    </Box>
  );
});

MemoizedRefreshButton.propTypes = {
  containerClass: PropTypes.string,
};

export default function RefreshButton() {
  const theme = useTheme();
  const classes = {
  refreshButtonContainer: {
    display: "inline-block",
    verticalAlign: "top",
    marginTop: theme.spacing(2.5),
    marginRight: theme.spacing(2),
  },
};
  return (
    <MemoizedRefreshButton containerClass={classes.refreshButtonContainer} />
  );
}
