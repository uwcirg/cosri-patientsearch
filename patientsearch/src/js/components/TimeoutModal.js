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
let retryAttempts = 0;

export default function TimeoutModal() {
  const classes = useStyles(theme);
  //assigned identifier for each tracked session
  const getUniqueId = () => Math.floor(Math.random() * Math.floor(Math.random() * Math.random() * Date.now()));
  const [modalStyle] = React.useState(getModalStyle);
  const [open, setOpen] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  const [trackerId, setTrackerId] = React.useState(getUniqueId());
  let trackInterval = 15000; //miliseconds
  const appSettings = getAppSettings();
  const LAST_CHECKED_TIME = "FEMR_Session_Last_Checked_Time";

  const setLastCheckedTime = () => {
    localStorage.setItem(LAST_CHECKED_TIME, Date.now());
  };
  const getLastCheckedTime = () => {
    if (!localStorage.getItem(LAST_CHECKED_TIME)) return false;
    return parseFloat(localStorage.getItem(LAST_CHECKED_TIME));
  };
  const clearLastCheckedTime = () => {
    localStorage.removeItem(LAST_CHECKED_TIME);
  };
  const clearExpiredIntervalId = () => {
    clearInterval(expiredIntervalId);
  };
  const getStorageTrackerId = () => {
    return "token_tracker_"+trackerId;
  };
  const clearStorageTracker = () => {
    const storageKeys = Object.keys(sessionStorage);
    if (!storageKeys.length) return;
    storageKeys.forEach(key => {
      if (key.includes("token_tracker")) {
        sessionStorage.removeItem(key);
      }
    });
  };
  const clearTracker = () => {
    clearExpiredIntervalId();
    clearStorageTracker();
    clearLastCheckedTime();
  };
  const checkSessionValidity = () => {

    const lastCheckedTime = getLastCheckedTime();
    const elapsedTime = lastCheckedTime ? Math.floor((Date.now() - lastCheckedTime) / 1000) : false;
    if (elapsedTime && (elapsedTime - Math.floor(trackInterval / 1000)) > 1) {
      // IF the last time that the validity of the current session was checked was more than the tracking interval, it could be an indication that:
      // - computer has gone to sleep
      // - user gone on another tab, or
      // - user logged out in another tab, etc.
      // THEREFORE clear previously existing tracker, just reload page here?
      clearTracker();
      reLoad();
      return;
    }

    const currentTime = Date.now() / 1000; //in seconds;
    /*
     * when the expires in is less than the next track interval, the session will have expired, so just logout user
     */
    if (expiresIn && expiresIn > 0 && expiresIn <= trackInterval / 1000) {
      handleLogout();
      return;
    }
    const trackerSessionObj = sessionStorage.getItem(getStorageTrackerId());
    if (!trackerSessionObj) {
      console.log("No session storage item for tracking token validity available");
      reTry();
      return;
    }
    let tokenData = null;
    try {
      tokenData = JSON.parse(trackerSessionObj);
    } catch(e) {
      console.log("Unable to parse token data");
      reTry();
      return;
    }
    const accessTokenExpiresIn = parseFloat(tokenData["accessTokenExpiryDateTime"]) - currentTime;

    if (accessTokenExpiresIn < 0) {
      //in the past?
      reTry();
      return;
    }

    //record check time
    setLastCheckedTime();

    const refreshTokenExpiresIn = parseFloat(tokenData["refreshTokenExpiryDateTime"]) - currentTime;
    const refreshTokenOnVentilator = (!tokenData["valid"] && parseInt(refreshTokenExpiresIn) <= 0) || (refreshTokenExpiresIn < accessTokenExpiresIn);

    //in seconds
    //1. check if refresh token will expire before access token first
    //2. check if access token will expire
    expiresIn = refreshTokenOnVentilator
      ? refreshTokenExpiresIn
      : accessTokenExpiresIn;

    if (hasAppSettings() && appSettings["SYSTEM_TYPE"].toLowerCase() === "development") {
      console.log("Session will expire in? ", expiresIn);
    }
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
    if (!tokenAboutToExpire) {
      return;
    }
    if (disabled) {
      //automatically refresh the session IF access token is about to expire AND refresh token has not expired yet
      setTimeout(() => {
        if (refreshTokenOnVentilator) handleLogout();
        else reLoad();
      }, 3000);
    }
    cleanUpModal();
    if (!open) handleOpen();
  };

  const initTimeoutTracking = () => {

    sendRequest("./validate_token").then(
      (response) => {
        if (!response) {
          reTry();
        }
        let tokenData = null;
        try {
          tokenData = JSON.parse(response);
        } catch(e) {
          console.log(`Error occurred parsing token data ${e}`);
          reTry();
          return;
        }
        if (!tokenData || !Object.keys(tokenData).length) {
          reTry();
          return;
        }
        clearTracker();
        const currentTime = Date.now() / 1000;
        const accessTokenExpiresIn = parseFloat(tokenData["access_expires_in"]);
        //access token lifetime
        tokenData["accessTokenExpiryDateTime"] = accessTokenExpiresIn + currentTime; //in seconds
        //refresh token lifetime
        tokenData["refreshTokenExpiryDateTime"] = parseFloat(tokenData["refresh_expires_in"]) + currentTime; //in seconds
        //use unique id for each token tracking
        setTrackerId(getUniqueId());
        sessionStorage.setItem(getStorageTrackerId(), JSON.stringify(tokenData));
        //do an initial check
        checkSessionValidity();
        //check token validity based on token lifetime every set interval
        expiredIntervalId = setInterval(
          () => checkSessionValidity(),
          trackInterval
        );
      },
      //handle error
      (error) => {
        console.log("Error returned ", error);
        if (error && error.status && error.status == 401) {
          console.log("Failed to retrieve token data: Unauthorized");
          handleLogout();
          return;
        }
        console.log(
          "Failed to retrieve token data",
          error && error.status ? "status " + error.status : ""
        );
        //attempt retry if error
        reTry();
      }
    );
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    clearTracker();
    setOpen(false);
  };

  const reTry = () => {
    //try again?
    if (retryAttempts < 2) {
      clearTracker();
      initTimeoutTracking();
      retryAttempts++;
      return;
    }
    retryAttempts = 0;
    clearTracker();
  };

  const reLoad = () => {
    handleClose();
    //To force-request a new Access Token (when one is about to expire, but still valid)
    window.location = "/clear_session";
  };

  const handleLogout = (userInitiated) => {
    clearTracker();
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
              {refresh && <div className={classes.infoDescription}>One moment while your browser session is refreshed....</div>}
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

  const hasAppSettings = () => {
    return appSettings && Object.keys(appSettings).length > 0;
  };

  useEffect(() => {
    setDisabled(appSettings["ENABLE_INACTIVITY_TIMEOUT"]?false:true);
    clearTracker();
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
