import React, { useRef } from "react";
import { useTheme } from "@mui/material/styles";
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
import Logo from "./Logo";
import SiteLogo from "./SiteLogo";
import {
  getAppLaunchURL,
  getClientsByRequiredRoles,
  getProjectLogoPath,
  getSiteLogoPath,
  imageOK,
  isEmptyArray,
  setDocumentTitle,
  setFavicon,
} from "../helpers/utility";
import {
  useSettingContext,
  useUserContext,
} from "../context/AppContextProvider";

const logoutURL = "/logout?user_initiated=true";

export default function Header() {
  const theme = useTheme();
  const appSettings = useSettingContext().appSettings;
  const { user: userInfo, error: userError } = useUserContext();
  const appClients = appSettings
    ? getClientsByRequiredRoles(appSettings["SOF_CLIENTS"], userInfo?.roles)
    : null;
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openPopper, setOpenPopper] = React.useState(false);

  // derived straight from settings
  const appTitle = appSettings?.APPLICATION_TITLE ?? "";
  const projectName = appSettings?.PROJECT_NAME ?? "";
  const siteId = appSettings?.SITE_ID ?? "";
  const projectLogoPath = getProjectLogoPath(projectName);
  const siteLogoPath = getSiteLogoPath(siteId);
  // show the project logo only when it isn't the same image as the site logo
  const showProjectLogo =
    !!projectLogoPath &&
    String(projectLogoPath).toLowerCase() !==
      String(siteLogoPath).toLowerCase();

  const hasUserInfo = () => {
    return userInfo && (userInfo.username || userInfo.name || userInfo.email);
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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "100%",
        gap: theme.spacing(1),
        marginLeft: theme.spacing(1),
        "& > *": {
          fontWeight: 400,
          marginRight: theme.spacing(0.5),
        },
      }}
    >
      <Link
        sx={{
          position: "relative",
          top: "-2px",
        }}
        color="secondary"
        variant="body1"
        href={logoutURL}
      >
        Logout
      </Link>
      <Link
        color="secondary"
        variant="body1"
        href={logoutURL}
        aria-label="Link for logout"
      >
        <ExitToAppIcon
          color="secondary"
          fontSize="medium"
          sx={{
            color: theme.palette.secondary.light,
          }}
        ></ExitToAppIcon>
      </Link>
    </Box>
  );

  const renderUserInfoComponent = (isMobile) => (
    <div>
      <Typography
        component="h6"
        variant="h6"
        color="textPrimary"
        noWrap
        sx={{
          marginTop: theme.spacing(0.5),
          marginBottom: theme.spacing(0.5),
          fontWeight: 400,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: isMobile? "flex-end": "flex-start",
          gap: "8px",
        }}
      >
        <Avatar
          sx={{
            color: theme.palette.primary.dark,
            borderColor: theme.palette.primary.dark,
            borderWidth: "1px",
            borderStyle: "solid",
            background: "transparent",
            marginRight: theme.spacing(1),
            width: "32px",
            height: "32px",
          }}
        >
          <HowToRegIcon />
        </Avatar>
        <span>Welcome</span>
        {hasUserInfo() && (
          <span>{userInfo.username || userInfo.name || userInfo.email}</span>
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
        className={`${isMobile ? "flex-column flex-1" : "flex"}`}
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
              sx={{
                alignSelf: {
                  xs: "flex-end",
                  sm: "center"
                }
              }}
            >
              {client.label}
            </Button>
          );
        })}
      </div>
    );
  };

  const documentSetupRef = useRef(false);

  React.useEffect(() => {
    if (documentSetupRef.current || !appSettings?.PROJECT_NAME) return;
    documentSetupRef.current = true;
    setDocumentTitle(
      `${appSettings.PROJECT_NAME} ${appSettings.SEARCH_TITLE_TEXT ?? ""}`.trim(),
    );
    setFavicon(`/static/${appSettings.PROJECT_NAME}_favicon.ico`);
  }, [appSettings]);

  // close the mobile menu on resize
  React.useEffect(() => {
    const handleResize = () => setOpenPopper(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <AppBar
      position="absolute"
      sx={{
        zIndex: 999,
        transition: theme.transitions.create(["width", "margin"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar
        sx={{
          padding: "0 8px",
          background: "#FFF",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: theme.spacing(1),
        }}
        disableGutters
        variant="dense"
      >
        {showProjectLogo && (
          <Logo
            src={projectLogoPath}
            alt="Project Logo"
            onLoad={handleImageLoaded}
            onError={handleImageLoadError}
            sx={{ maxWidth: { xs: 200, sm: 220, md: 220 }, flexShrink: 0 }}
          />
        )}
        <SiteLogo siteID={siteId} />
        {!userError && (
          <Box className="flex flex-gap-1">
            <Box
              sx={{
                [theme.breakpoints.down("md")]: {
                  display: "none",
                },
              }}
            >
              {renderClientButtons(false)}
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginRight: theme.spacing(4),
                marginLeft: theme.spacing(4),
                minWidth: theme.spacing(25),
                minHeight: theme.spacing(1),
                [theme.breakpoints.down("md")]: {
                  display: "none",
                },
              }}
            >
              {renderUserInfoComponent()}
              {hasUserInfo() && renderLogoutComponent()}
            </Box>
          </Box>
        )}
        {!userError && (
          <ClickAwayListener onClickAway={handleClickAway}>
            <Box
              sx={{
                display: "flex",
                position: "relative",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                [theme.breakpoints.up("md")]: {
                  display: "none",
                },
              }}
            >
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
                      sx={{
                        padding: theme.spacing(2),
                      }}
                      variant="outlined"
                      square={true}
                    >
                      {renderUserInfoComponent(true)}
                      <Box className="flex flex-gap-1">
                        {renderClientButtons(true)}
                        {hasUserInfo() && renderLogoutComponent()}
                      </Box>
                    </Paper>
                  </Fade>
                )}
              </Popper>
            </Box>
          </ClickAwayListener>
        )}
      </Toolbar>
      {appTitle && (
        <Toolbar
          sx={{
            padding: theme.spacing(0, 2),
            minHeight: theme.spacing(5),
          }}
          disableGutters
          variant="dense"
        >
          <Typography
            component="h1"
            variant="h5"
            noWrap
            align="center"
            sx={{
              color: "inherit",
              width: "100%",
            }}
          >
            {appTitle}
          </Typography>
        </Toolbar>
      )}
    </AppBar>
  );
}
