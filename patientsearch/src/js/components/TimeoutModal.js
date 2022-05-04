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
let trackerId = 0;

export default function TimeoutModal() {
  const classes = useStyles(theme);
  //assigned identifier for each tracked session
  const getUniqueId = () => Math.floor(Math.random() + Math.floor(Math.random() + Math.random() + Date.now()));
  const [modalStyle] = React.useState(getModalStyle);
  const [open, setOpen] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  const appSettings = getAppSettings();
  const LAST_CHECKED_TIME = "Last_Checked_Time";
  const TOKEN_KEY = "FEMR_TOKEN_";
  const RELOAD_STORAGE_KEY=TOKEN_KEY+"RELOAD";
  const LOGOUT_STORAGE_KEY=TOKEN_KEY+"LOGOUT";
  const RELOAD_URL = "/clear_session";
  const LOGOUT_URL = "/logout";

  const clearExpiredIntervalId = () => {
    clearInterval(expiredIntervalId);
  };
  const getStorageTracker = () => {
    const o = sessionStorage.getItem(trackerId);
    if (!o) return false;
    return JSON.parse(o);
  };
  const setStorageTracker = (tokenData) => {
    if (!tokenData) return;
    trackerId = TOKEN_KEY+tokenData.id;
    sessionStorage.setItem(trackerId, JSON.stringify(tokenData));
  };
  const clearStorageTracker = () => {
    const storageKeys = [...Object.keys(sessionStorage), ...Object.keys(localStorage)];
    if (!storageKeys.length) return;
    storageKeys.forEach(key => {
      if (key.includes(TOKEN_KEY)) {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      }
    });
  };
  const clearTracker = () => {
    clearExpiredIntervalId();
    clearStorageTracker();
    trackerId = null;
  };
  const checkTokenValidity = () => {
    let tokenData = null;

    try {
      tokenData = getStorageTracker();
    } catch(e) {
      console.log("Unable to parse token data");
      reTry();
      return;
    }

    if (!tokenData) return false;

    const accessTokenExpiresIn = parseFloat(tokenData["access_expires_in"]); //in seconds
    const refreshTokenExpiresIn = parseFloat(tokenData["refresh_expires_in"]); //in seconds
    const refreshTokenOnVentilator = (!tokenData["valid"] && parseInt(refreshTokenExpiresIn) <= 0) || (refreshTokenExpiresIn < accessTokenExpiresIn);
    //get token life time
    expiresIn = refreshTokenOnVentilator ? refreshTokenExpiresIn : accessTokenExpiresIn; //in seconds
  
    if (hasAppSettings() && appSettings["SYSTEM_TYPE"].toLowerCase() === "development") {
      console.log("Session will expire in? ", expiresIn);
    }

    console.log("refresh token on ventilator ", refreshTokenOnVentilator)
    if (refreshTokenOnVentilator) {
      if (!tokenData["valid"] || refreshTokenExpiresIn <= 1) {
        handleLogout();
        return;
      }
      reLoad();
      return;
    }

    let lastCheckedTime = tokenData[LAST_CHECKED_TIME] ? parseFloat(tokenData[LAST_CHECKED_TIME]): 0;
    let elapsedTime = (Date.now() - lastCheckedTime) / 1000; //in seconds

    // console.log("token data ", tokenData)
    // console.log("Elapsed time? ", elapsedTime);

    const timeRemaining = (expiresIn - elapsedTime);
    //console.log("Remaining time ", timeRemaining);

    if (timeRemaining < 0) { //in the past?
      reTry();
      return;
    }

    let tokenAboutToExpire = timeRemaining <= 60;
    //flag for whether to prompt the user to refresh session, i.e. request another access token
    refresh = tokenAboutToExpire? true : false;

    const minuteBeforeExpire = 60;

    if (!Math.floor(elapsedTime) || !tokenAboutToExpire) {
      const nextWarningInterval = (timeRemaining - minuteBeforeExpire) > minuteBeforeExpire ?
                                  Math.floor(timeRemaining - minuteBeforeExpire) :
                                  timeRemaining / 3;
      console.log("track interval? ", nextWarningInterval);
      clearExpiredIntervalId();
      expiredIntervalId = setInterval(
        () => checkTokenValidity(),
        nextWarningInterval * 1000
      );
      return;
    }
    if (disabled) {
      //automatically refresh the session IF access token is about to expire AND refresh token has not expired yet
      setTimeout(() => {
        reLoad();
      }, 3000);
    }
    openModal();
  };

  const initTimeoutTracking = () => {

    clearTracker();
    sendRequest("./validate_token").then(
      (response) => {
        if (!response) {
          console.log("retry no response")
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
          console.log("retry no token data")
          reTry();
          return;
        }

        tokenData[LAST_CHECKED_TIME] = Date.now();
        tokenData["id"] = TOKEN_KEY+getUniqueId();

        //use unique id for each token tracking
        setStorageTracker(tokenData);

        //do an initial check
        checkTokenValidity();

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

  const cleanUpModal = () => {
    let modalElement = document.querySelector(".timeout-modal");
    if (modalElement && modalElement.parentNode) {
      try {
        modalElement.parentNode.removeChild(modalElement);
      } catch(e) {
        console.log("Error removing modal element ", e);
      }
    }
  };

  const openModal = () => {
    cleanUpModal();
    if (!open) handleOpen();
  };

  const reTry = () => {
    //try again?
    if (retryAttempts < 2) {
      clearTracker();
      initTimeoutTracking();
      console.log("retry attempt ", retryAttempts)
      retryAttempts++;
      return;
    }
    retryAttempts = 0;
    clearTracker();
  };

  const reLoad = () => {
    handleClose();
    localStorage.setItem(RELOAD_STORAGE_KEY, true);
    //To force-request a new Access Token (when one is about to expire, but still valid)
    window.location =  RELOAD_URL;
  };

  const handleLogout = (userInitiated) => {
    clearTracker();
    sessionStorage.clear();
    localStorage.setItem(LOGOUT_STORAGE_KEY, true);
    let param = userInitiated ? "user_initiated=true" : "timeout=true";
    setTimeout(() => {
      window.location = `${LOGOUT_URL}?${param}`;
    }, 0);
    return false;
  };

  const getExpiresInDisplay = (expiresIn) => {
    if (!expiresIn) return "";
    return `${Math.floor(expiresIn)} seconds`;
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
    if (Object.keys(appSettings).length) {
      initTimeoutTracking();
    }
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
