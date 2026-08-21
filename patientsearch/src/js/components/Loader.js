import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";

export default function Loader() {
  return (
    <Box
      sx={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%" }}
    >
      <Stack direction="row" spacing={2} className="p-all-2">
        <Box>Loading...</Box>
        <CircularProgress color="primary"></CircularProgress>
      </Stack>
    </Box>
  );
}
