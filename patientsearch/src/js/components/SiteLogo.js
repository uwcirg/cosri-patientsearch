import React from "react";
import PropTypes from "prop-types";
import Logo from "./Logo";
import { getSiteLogoPath } from "../helpers/utility";
import { useSettingContext } from "../context/AppContextProvider";

const handleImageLoaded = () => {
  // site logo is confirmed present: hide the fallback default logo, if any
  const defaultLogoImage = document.querySelector(".default-logo");
  if (defaultLogoImage) defaultLogoImage.setAttribute("disabled", true);
};

export default function SiteLogo({ siteID, appSettings, sx }) {
  const settingsCtx = useSettingContext();
  const settings = appSettings ?? settingsCtx?.appSettings;
  const siteId = siteID || settings?.SITE_ID || "";

  return (
    <Logo
      src={getSiteLogoPath(siteId)}
      alt="Site Logo"
      onLoad={handleImageLoaded}
      sx={sx}
    />
  );
}

SiteLogo.propTypes = {
  siteID: PropTypes.string,
  appSettings: PropTypes.object,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};
