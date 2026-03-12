import React from "react";
import makeStyles from "@mui/styles/makeStyles";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import Link from "@mui/material/Link";
import Popper from "@mui/material/Popper";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import SiteLogo from "./SiteLogo";
import {
  getAppLaunchURL,
  getClientsByRequiredRoles,
  imageOK,
  isEmptyArray,
  setDocumentTitle,
  setFavicon,
} from "../helpers/utility";
import { useSettingContext } from "../context/SettingContextProvider";
import { useUserContext } from "../context/UserContextProvider";

const logoutURL = "/logout?user_initiated=true";
const useStyles = makeStyles((theme) => ({
  toolbar: {
    paddingRight: 16, // keep right padding when drawer closed
    minHeight: theme.spacing(5),
  },
  topBar: {
    padding: 0,
    background: "#FFF",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(1),
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
    // marginLeft: theme.spacing(3),
  },
  title: {
    width: "100%",
  },
  desktopOnly: {
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  },
  welcomeContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginRight: theme.spacing(4),
    marginLeft: theme.spacing(4),
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  },
  mobileWelcomeContainer: {
    display: "flex",
    position: "relative",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    [theme.breakpoints.up("md")]: {
      display: "none",
    },
  },
  menuContainer: {
    padding: theme.spacing(2),
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
  const appClients = appSettings
    ? getClientsByRequiredRoles(appSettings["SOF_CLIENTS"], userInfo?.roles)
    : null;
  const [appTitle, setAppTitle] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openPopper, setOpenPopper] = React.useState(false);
  const hasUserInfo = () => {
    return userInfo && (userInfo.username || userInfo.name || userInfo.email);
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

  const handleClickAway = () => {
    setOpenPopper(false);
  };

  const handleHambagaMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
    setOpenPopper((prev) => !prev);
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
            {userInfo.username || userInfo.name || userInfo.email}
          </span>
        )}
      </Typography>
    </div>
  );

  const renderClientButtons = (isMobile) => {
    if (isEmptyArray(appClients)) return null;
    if (!hasUserInfo()) return null;
    const standaloneClients = appClients.filter(
      (c) => String(c.standalone).toLowerCase() === "true",
    );
    if (!standaloneClients.length) return null;
    return (
      <div
        className={`${isMobile ? "flex-column" : "flex"}`}
        style={{ justifyContent: "flex-end", flex: 1, gap: "8px" }}
      >
        {standaloneClients.map((client, index) => {
          const onClickEvent = () =>
            (window.location.href = getAppLaunchURL("", {
              ...appSettings,
              launch_url: client?.launch_url,
            }));
          return (
            <Button
              variant="outlined"
              onClick={onClickEvent}
              key={`${client.id}_standalone_button_${index}`}
            >
              {client.label}
            </Button>
          );
        })}
      </div>
    );
  };

  React.useEffect(() => {
    if (appSettings) {
      if (appSettings["APPLICATION_TITLE"])
        setAppTitle(appSettings["APPLICATION_TITLE"]);
      if (appSettings["PROJECT_NAME"]) {
        setProjectName(appSettings["PROJECT_NAME"]);
        setDocumentTitle(
          `${appSettings["PROJECT_NAME"]} ${appSettings["SEARCH_TITLE_TEXT"]}`,
        );
        setFavicon(`/static/${appSettings["PROJECT_NAME"]}_favicon.ico`);
      }
    }
    const handleResize = () => setOpenPopper(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [appSettings]);

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
        {!userError && renderClientButtons(false)}
        {!userError && (
          <Box className={classes.welcomeContainer}>
            {renderUserInfoComponent()}
            {hasUserInfo() && renderLogoutComponent()}
          </Box>
        )}
        {!userError && (
          <ClickAwayListener onClickAway={handleClickAway}>
            <Box className={classes.mobileWelcomeContainer}>
              <Button onClick={handleHambagaMenuClick}>
                <MenuIcon fontSize="large"></MenuIcon>
              </Button>
              <Popper
                open={openPopper}
                anchorEl={anchorEl}
                placement={"bottom-start"}
                transition
                style={{ zIndex: 100000 }}
              >
                {({ TransitionProps }) => (
                  <Fade {...TransitionProps} timeout={350}>
                    <Paper
                      className={classes.menuContainer}
                      variant="outlined"
                      square={true}
                    >
                      {renderUserInfoComponent()}
                      {renderClientButtons(true)}
                      {hasUserInfo() && renderLogoutComponent()}
                    </Paper>
                  </Fade>
                )}
              </Popper>
            </Box>
          </ClickAwayListener>
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
