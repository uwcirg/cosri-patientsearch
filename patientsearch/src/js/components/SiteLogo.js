import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import { imageOK } from "../helpers/utility";
import { useSettingContext } from "../context/AppContextProvider";

export default function SiteLogo(props) {
  const settingsCtx = useSettingContext();
  const appSettings = props.appSettings
    ? props.appSettings
    : settingsCtx.appSettings; //provide default if none provided
  const SITE_ID_STRING = "SITE_ID";
  const getSiteId = () => {
    if (props.siteID) return props.siteID;
    if (!appSettings || !Object.keys(appSettings)) return "";
    return appSettings[SITE_ID_STRING];
  };
  const handleImageLoaded = (e) => {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.setAttribute("disabled", true);
      return;
    }
    let defaultLogoImage = document.querySelector(".default-logo");
    if (defaultLogoImage) {
      defaultLogoImage.setAttribute("disabled", true);
    }
  };
  const handleImageLoadError = (e) => {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.setAttribute("disabled", true);
      return;
    }
  };
  const getSiteImagePath = () => {
    return "/static/" + String(getSiteId()).toUpperCase() + "/img/logo.png";
  };

  return (
    <Box className="text-center" sx={{ width: "180px" }}>
      {getSiteId() && (
        <img
          src={getSiteImagePath()}
          onLoad={handleImageLoaded}
          onError={handleImageLoadError}
          alt="Site Logo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        ></img>
      )}
    </Box>
  );
}
SiteLogo.propTypes = {
  siteID: PropTypes.string,
  appSettings: PropTypes.object,
};
