import React, { memo } from "react";
import PropTypes from "prop-types";
import { Box, Button, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const refreshFunction = () => {
  location.reload();
};

const MemoizedRefreshButton = memo(function MemoizedRefreshButton() {
  return (
    <Box className="refresh__container">
      <Tooltip title="Refresh the list">
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={refreshFunction}
          sx={{
            color: "primary.dark",
            borderColor: "primary.dark"
          }}
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
  return <MemoizedRefreshButton />;
}
