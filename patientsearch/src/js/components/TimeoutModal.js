import React, { useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Modal from "@material-ui/core/Modal";
import { sendRequest } from "./Utility";
import theme from "../context/theme";
import { getAppSettings } from "../context/SettingContextProvider";

function getModalStyle() {
  const top = 50;
  const left = 50;
  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: `translate(-${top}%, -${left}%)`,
  };
}

const useStyles = makeStyles((theme) => ({
  paper: {
    position: "absolute",
    width: 480,
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${theme.palette.primary.main}`,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
  infoDescription: {
    color: theme.palette.primary.warning,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    fontWeight: 500
  },
  expiredDisplay: {
    fontWeight: 500,
    marginLeft: theme.spacing(0.5)
  }
}));

let expiredIntervalId = 0;
let expiresIn = null;
let refresh = false;

export default function TimeoutModal() {
  const classes = useStyles(theme);
  const [modalStyle] = React.useState(getModalStyle);
  const [open, setOpen] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  const trackInterval = 15000;
  const appSettings = getAppSettings();

  const clearExpiredIntervalId = () => {
    clearInterval(expiredIntervalId);
  };
  const checkSessionValidity = () => {
    /*
     * when the expires in is less than the next track interval, the session will have expired, so just logout user
     */
    if (expiresIn && expiresIn > 0 && expiresIn <= trackInterval / 1000) {
      handleLogout();
      return;
    }
    sendRequest("./validate_token").then(
      (response) => {
        if (response) {
          let tokenData = null;
          try {
            tokenData = JSON.parse(response);
            let accessTokenExpiresIn = parseFloat(
              tokenData["access_expires_in"]
            );
            let refreshTokenExpiresIn = parseFloat(
              tokenData["refresh_expires_in"]
            );
            let refreshTokenOnVentilator =
              refreshTokenExpiresIn < accessTokenExpiresIn;
            //in seconds
            //1. check if refresh token will expire before access token first
            //2. check if access token will expire
            expiresIn = refreshTokenOnVentilator
              ? refreshTokenExpiresIn
              : accessTokenExpiresIn;
            let tokenAboutToExpire =
              Math.floor(expiresIn) >= 1 && Math.floor(expiresIn) <= 60;
            //flag for whether to prompt the user to refresh session, i.e. request another access token
            refresh =
              tokenAboutToExpire && !refreshTokenOnVentilator ? true : false;

            if (!tokenData["valid"] || expiresIn <= 1) {
              if (refreshTokenOnVentilator) {
                handleLogout();
              } else {
                reLoad();
              }
              return;
            }
            if (tokenAboutToExpire) {
              if (!refreshTokenOnVentilator && disabled) {
                //automatically refresh the session IF access token is about to expire AND refresh token has not expired yet
                setTimeout(() => reLoad(), 5000);
              }
              cleanUpModal();
              if (!open) handleOpen();
            }
          } catch (e) {
            console.log(`Error occurred parsing token data ${e}`);
            clearExpiredIntervalId();
            return;
          }
        }
      },
      (error) => {
        console.log("Error returned ", error);
        if (error && error.status && error.status == 401) {
          console.log("Failed to retrieve token data: Unauthorized");
          handleLogout();
          return;
        }
        clearExpiredIntervalId();
        console.log(
          "Failed to retrieve token data",
          error ? error.statusText : ""
        );
      }
    );
  };

  const initTimeoutTracking = () => {
    expiredIntervalId = setInterval(
      () => checkSessionValidity(),
      trackInterval
    );
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    clearExpiredIntervalId();
    setOpen(false);
  };

  const reLoad = () => {
    handleClose();
    //To force-request a new Access Token (when one is about to expire, but still valid)
    window.location = "/clear_session";
  };

  const handleLogout = (userInitiated) => {
    clearExpiredIntervalId();
    sessionStorage.clear();
    let param = userInitiated ? "user_initiated=true" : "timeout=true";
    setTimeout(() => {
      window.location = `/logout?${param}`;
    }, 0);
    return false;
  };

  const getExpiresInDisplay = (expiresIn) => {
    if (!expiresIn) return "";
    return `${Math.floor(expiresIn)} seconds`;
  };

  const cleanUpModal = () => {
    let modalElement = document.querySelector(".timeout-modal");
    if (modalElement) {
      modalElement.parentNode.removeChild(modalElement);
    }
  };
  const body = (
    <div style={modalStyle} className={classes.paper}>
      <h2 id="timeout-modal-title">Session Timeout Notice</h2>
      <div id="timeout-modal-description">
        {expiresIn && expiresIn == 0 && (
          <span className="error">Your current session has expired.</span>
        )}
        {expiresIn && expiresIn != 0 && (
          <React.Fragment>
            {!disabled && <span>
              Your session will expired in approximately
              <span className={classes.expiredDisplay}>{getExpiresInDisplay(expiresIn)}</span>.
            </span>}
            {disabled && <div>
              <div>Your session is about to expire.</div>
              <div className={classes.infoDescription}>One moment while your browser session is refreshed....</div>
            </div>}
          </React.Fragment>
        )}
        <div className="buttons-container">
          {/*
           * access token about to expire so ask user if they want to refresh session
           * NOTE this button won't show if refresh token is about to expire, i.e. SSO Session Max has been reached
           */}
          {!disabled && refresh && (
            <Button variant="outlined" onClick={reLoad}>
              Refresh Session
            </Button>
          )}
          <Button variant="outlined" onClick={handleClose}>
            Dismiss
          </Button>
          <Button variant="outlined" onClick={() => handleLogout(true)}>
            Log Out
          </Button>
        </div>
      </div>
      <TimeoutModal />
    </div>
  );
  useEffect(() => {
    clearExpiredIntervalId();
    setDisabled(appSettings["ENABLE_INACTIVITY_TIMEOUT"]?false:true);
    initTimeoutTracking();
  }, [appSettings]);

  return (
    <div>
      <Modal
        open={open}
        onClose={handleClose}
        className="timeout-modal"
        aria-labelledby="timeout-modal-title"
        aria-describedby="timeout-modal-description"
      >
        {body}
      </Modal>
    </div>
  );
}
