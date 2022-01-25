import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import { imageOK } from "./Utility";
import { getAppSettings } from "../context/SettingContextProvider";
import theme from "../context/theme";

const useStyles = makeStyles({
  container: {
    textAlign: "center",
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
});

export default function SiteLogo(props) {
  const classes = useStyles();
  const appSettings = props.appSettings ? props.appSettings : getAppSettings(); //provide default if none provided
  const SITE_ID_STRING = "SITE_ID";
  React.useEffect(() => {
    //wait for application settings
  }, [appSettings]);
  function getSiteId() {
    if (props.siteID) return props.siteID;
    if (!Object.keys(appSettings)) return "";
    return appSettings[SITE_ID_STRING];
  }
  function handleImageLoaded(e) {
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
  }
  function handleImageLoadError(e) {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.setAttribute("disabled", true);
      return;
    }
  }
  const getSiteImagePath = () => {
    return "/static/" + getSiteId() + "/img/logo.png";
  };

  return (
    <div className={classes.container}>
      {getSiteId() && (
        <img
          src={getSiteImagePath()}
          onLoad={handleImageLoaded}
          onError={handleImageLoadError}
        ></img>
      )}
    </div>
  );
}
SiteLogo.propTypes = {
  siteID: PropTypes.string,
  appSettings: PropTypes.object
};
