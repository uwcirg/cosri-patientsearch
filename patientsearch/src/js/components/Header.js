import React from "react";
import makeStyles from '@mui/styles/makeStyles';
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
import { imageOK, setDocumentTitle, setFavicon } from "../helpers/utility";
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
    [theme.breakpoints.down('md')]: {
      display: "none",
    },
  },
  mobileWelcomeContainer: {
    display: "flex",
    position: "relative",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing(4),
    marginLeft: theme.spacing(4),
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
        setDocumentTitle(
          `${appSettings["PROJECT_NAME"]} ${appSettings["SEARCH_TITLE_TEXT"]}`
        );
        setFavicon(`/static/${appSettings["PROJECT_NAME"]}_favicon.ico`);
      }
    }
    if (typeof window !== "undefined")
      window.addEventListener("resize", () => setOpenPopper(false));
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
