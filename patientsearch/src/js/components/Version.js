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
  const [version, setVersion] = React.useState("");
  const VERSION_STRING = "VERSION_STRING";
  const {appSettings} = useSettingContext();
  const getVersionLink = () => {
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
      <a href={link} target="_blank" rel="noreferrer">
        {version}
      </a>
    ) : (
      version
    );
  };
  React.useEffect(() => {
    /*
     * retrieve setting information
     */
    setVersion(getVersionString());
  }, [appSettings]);
  function getVersionString() {
    if (!Object.keys(appSettings)) return "";
    return appSettings[VERSION_STRING];
  }
  return (
    <div className={props.className ? props.className : classes.container}>
      {version && <div>Version Number: {getVersionLink()}</div>}
    </div>
  );
}

Version.propTypes = {
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
};
