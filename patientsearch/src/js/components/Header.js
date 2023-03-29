import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Avatar from "@material-ui/core/Avatar";
import Box from "@material-ui/core/Box";
import ExitToAppIcon from "@material-ui/icons/ExitToApp";
import Link from "@material-ui/core/Link";
import HowToRegIcon from "@material-ui/icons/HowToReg";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import SiteLogo from "./SiteLogo";
import {
  imageOK,
  setDocumentTitle,
  setFavicon,
} from "../helpers/utility";
import { useSettingContext } from "../context/SettingContextProvider";
import { useUserContext } from "../context/UserContextProvider";

const useStyles = makeStyles((theme) => ({
  toolbar: {
    paddingRight: 16, // keep right padding when drawer closed
  },
  topBar: {
    padding: 0,
    background: "#FFF",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 8px",
    ...theme.mixins.toolbar,
  },
  appBar: {
    zIndex: 999,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  //logo styling
  logo: {
    width: "180px",
    marginLeft: theme.spacing(3),
  },
  title: {
    width: "100%",
  },
  welcomeContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginRight: theme.spacing(4),
    marginLeft: theme.spacing(4),
  },
  welcomeText: {
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
    fontWeight: 400,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    color: theme.palette.primary.dark,
    borderColor: theme.palette.primary.dark,
    borderWidth: "1px",
    borderStyle: "solid",
    background: "transparent",
    marginRight: theme.spacing(1),
    width: "32px",
    height: "32px",
  },
  buttonContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
    marginLeft: theme.spacing(1),
    "& > *": {
      fontWeight: 400,
      marginRight: theme.spacing(0.5),
    },
  },
  linkIcon: {
    color: theme.palette.secondary.light,
  },
  linkText: {
    position: "relative",
    top: "-2px",
  },
  userinfo: {
    marginLeft: "8px",
  },
}));

export default function Header() {
  const classes = useStyles();
  const appSettings = useSettingContext().appSettings;
  const { user: userInfo, error: userError } = useUserContext();
  const [appTitle, setAppTitle] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const hasUserInfo = () => {
    return userInfo && (userInfo.name || userInfo.email);
  };
  const getLogoURL = () => {
    if (!projectName) return "";
    return `/static/app/img/${projectName}_logo.png`;
  };

  const handleImageLoaded = (e) => {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.classList.add("ghost");
      return;
    }
    e.target.classList.remove("ghost");
  };

  const handleImageLoadError = (e) => {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.classList.add("ghost");
      return;
    }
  };

  const renderLogoutComponent = () => (
    <div className={classes.buttonContainer}>
      <Link
        className={classes.linkText}
        color="secondary"
        variant="body1"
        href={logoutURL}
      >
        Logout
      </Link>
      <Link color="secondary" variant="body1" href={logoutURL}>
        <ExitToAppIcon
          color="secondary"
          fontSize="medium"
          className={classes.linkIcon}
        ></ExitToAppIcon>
      </Link>
    </div>
  );

  const renderUserInfoComponent = () => (
    <div>
      <Typography
        component="h6"
        variant="h6"
        color="textPrimary"
        noWrap
        className={classes.welcomeText}
      >
        <Avatar className={classes.avatar}>
          <HowToRegIcon />
        </Avatar>
        <span className={classes.avatarText}>Welcome</span>
        {hasUserInfo() && (
          <span className={classes.userinfo}>
            {userInfo.name || userInfo.email}
          </span>
        )}
      </Typography>
    </div>
  );

  React.useLayoutEffect(() => {
    if (appSettings) {
      if (appSettings["APPLICATION_TITLE"])
        setAppTitle(appSettings["APPLICATION_TITLE"]);
      if (appSettings["PROJECT_NAME"]) {
        setProjectName(appSettings["PROJECT_NAME"]);
        setDocumentTitle(`${appSettings["PROJECT_NAME"]} Patient Search`);
        setFavicon(`/static/${appSettings["PROJECT_NAME"]}_favicon.ico`);
      }
    }
  }, [appSettings]);

  const logoutURL = "/logout?user_initiated=true";

  return (
    <AppBar position="absolute" className={classes.appBar}>
      <Toolbar className={classes.topBar} disableGutters variant="dense">
        <img
          src={getLogoURL()}
          alt="Logo"
          className={classes.logo}
          onLoad={handleImageLoaded}
          onError={handleImageLoadError}
        />
        <SiteLogo />
        {!userError && (
          <Box className={classes.welcomeContainer}>
            {renderUserInfoComponent()}
            {renderLogoutComponent()}
          </Box>
        )}
      </Toolbar>
      {appTitle && (
        <Toolbar className={classes.toolbar} disableGutters variant="dense">
          <Typography
            component="h1"
            variant="h5"
            color="inherit"
            noWrap
            className={classes.title}
            align="center"
          >
            {appTitle}
          </Typography>
        </Toolbar>
      )}
    </AppBar>
  );
}
