import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import useImageStatus from "../hooks/UseImageStatus";

/*
 * Generic, presentational logo image.
 * Renders nothing (no Box, no img) until the image is confirmed to exist,
 * and nothing at all if it is missing or can't be decoded.
 */
export default function Logo({ src, alt, onLoad, sx }) {
  const status = useImageStatus(src);
  if (status !== "loaded") return null;

  return (
    <Box
      sx={[
        { maxWidth: { xs: 200, sm: 240, md: 320 }, flexShrink: 0 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </Box>
  );
}

Logo.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  onLoad: PropTypes.func,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};
