import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import { imageOK } from "./Utility";
import { useSettingContext } from "../context/SettingContextProvider";
import theme from "../context/theme";

const useStyles = makeStyles({
  wrapper: {
    position: "relative",
  },
  loader: {
    textAlign: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  loadingIcon: {
    position: "absolute",
    top: "45vh",
  },
  container: {
    textAlign: "center",
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginTop: theme.spacing(21),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100",
    flex: "1 0 auto",
    paddingBottom: theme.spacing(4),
  },
  button: {
    width: "280px",
    borderWidth: "2px",
    marginTop: theme.spacing(3),
    fontWeight: 500,
    "&:hover": {
      borderWidth: "2px",
    },
  },
  introText: {
    marginBottom: theme.spacing(2.5),
    textAlign: "center",
    fontSize: "1.8rem",
    textTransform: "capitalize",
    fontWeight: 500,
  },
  bodyText: {
    marginTop: theme.spacing(3),
    maxWidth: "640px",
  },
  title: {
    fontSize: "1.25rem",
    lineHeight: "1.5",
  },
});

export default function Info(props) {
  const classes = useStyles();
  const settingsCtx = useSettingContext();
  const appSettings = props.appSettings
    ? props.appSettings
    : settingsCtx.appSettings; //provide default if none provided
  const SYSTEM_TYPE_STRING = "SYSTEM_TYPE";
  const SITE_ID_STRING = "SITE_ID";
  const [loading, setLoading] = React.useState(true);
  const siteID = getConfig(SITE_ID_STRING);

  function hasSettings() {
    return appSettings && Object.keys(appSettings).length > 0;
  }

  /* return config variable by key */
  function getConfig (key) {
    if (props.appSettings) return props.appSettings[key];
    if (!hasSettings()) return "";
    return appSettings[key];
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
  function getIntroText() {
    const siteIntroText = getConfig("LANDING_INTRO");
    if (siteIntroText) return siteIntroText;
    return `${getConfig(SYSTEM_TYPE_STRING)} System`;
  }
  function getButtonText() {
    const siteButtonText = getConfig("LANDING_BUTTON_TEXT");
    if (siteButtonText) return siteButtonText;
    return "Click here to log in";
  }
  function getBodyText() {
    //configurable display HTML body text for a specific site, IF available, will use it.
    if (getConfig("LANDING_BODY")) return getConfig("LANDING_BODY");
    //defaults
    if (!siteID)
      return `This is a ${getConfig(SYSTEM_TYPE_STRING)} system.  Not for clinical use.`;
    return "This system is only for use by clinical staff.";
  }

  React.useEffect(() => {
    setTimeout(() => setLoading(false), 250);
  }, []);

  return (
    <div className={classes.wrapper}>
      {loading && (
        <div className={classes.loader}>
          <CircularProgress
            size={56}
            color="primary"
            className={classes.loadingIcon}
          ></CircularProgress>
        </div>
      )}
      {!loading && hasSettings() && (
        <div className={classes.container}>
          {/* intro text, e.g. HTML block 1 */}
          <div className={classes.introText}>
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(getIntroText()),
              }}
            ></div>
          </div>
          {/* logo image */}
          {siteID && (
            <img
              src={"/static/" + siteID + "/img/logo.png"}
              onLoad={handleImageLoaded}
              onError={handleImageLoadError}
            ></img>
          )}
          {/* button */}
          <Button
            color="primary"
            href="/home"
            align="center"
            variant="outlined"
            size="large"
            className={classes.button}
          >
            {getButtonText()}
          </Button>
          {/* body text, e.g. HTML block 2 */}
          <div className={classes.bodyText}>
            <Typography
              component="h4"
              variant="h5"
              color="inherit"
              align="center"
              className={classes.title}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(getBodyText()),
                }}
              ></div>
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
}
Info.propTypes = {
  appSettings: PropTypes.object
};
