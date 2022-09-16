import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import theme from "../context/theme";
import { useSettingContext } from "../context/SettingContextProvider";

const useStyles = makeStyles({
  container: {
    textAlign: "right",
    margin: theme.spacing(2, 3, 2),
    color: theme.palette.muted.main,
    [theme.breakpoints.up("md")]: {
      maxWidth: "1080px",
      marginLeft: "auto",
      marginRight: "auto",
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
    },
  },
});

export default function Version(props) {
  const classes = useStyles();
  const VERSION_STRING = "VERSION_STRING";
  const settingsCtx = useSettingContext();
  const appSettings = props.appSettings
    ? props.appSettings
    : settingsCtx.appSettings; //provide default if none provided
  const getVersionLink = () => {
    let version = getVersionString();
    if (!version) return "";
    const arrVersion = version.split("-");
    /*
     * make sure version string doesn't contain 7 character git hash
     */
    const hasTaggedCommit =
      arrVersion.filter((item) => {
        //contains 'g' character and 7 character git hash
        return item.toLowerCase().indexOf("g") !== -1 && item.length === 8;
      }).length === 0;
    const link = hasTaggedCommit
      ? `https://github.com/uwcirg/cosri-environments/releases/tag/${version}`
      : "";
    return link ? (
      <a href={link} target="_blank" rel="noreferrer" noopener="true">
        {version}
      </a>
    ) : (
      version
    );
  };
  function getVersionString() {
    if (props.version) return props.version;
    if (!Object.keys(appSettings)) return "";
    return appSettings[VERSION_STRING];
  }
  React.useEffect(() => {
    //wait for application settings
  }, [appSettings]);
  return (
    <div className={props.className ? props.className : classes.container}>
      {getVersionString() && <div>Version Number: {getVersionLink()}</div>}
    </div>
  );
}

Version.propTypes = {
  version: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  appSettings: PropTypes.object,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};
