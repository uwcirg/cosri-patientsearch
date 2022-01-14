import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { getSettings, imageOK } from "./Utility";
import { useSettingContext } from "../context/SettingContextProvider";
import theme from "../context/theme";

const useStyles = makeStyles({
  container: {
    textAlign: "center",
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
});

export default function SiteLogo() {
  const classes = useStyles();
  const [siteID, setSiteID] = React.useState("");
  const {appSettings} = useSettingContext();
  const SITE_ID_STRING = "SITE_ID";
  React.useEffect(() => {
    setSiteID(getSiteId());
  }, [appSettings]);
  function getSiteId() {
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

  return (
    <div className={classes.container}>
      {siteID && (
        <img
          src={"/static/" + siteID + "/img/logo.png"}
          onLoad={handleImageLoaded}
          onError={handleImageLoadError}
        ></img>
      )}
    </div>
  );
}
