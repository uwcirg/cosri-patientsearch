import React, { useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import makeStyles from "@mui/styles/makeStyles";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import { sendRequest } from "../helpers/utility";
import { useSettingContext } from "../context/SettingContextProvider";

const MODAL_STYLE = {
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

const TRACK_INTERVAL_MS = 15000;

const getExpiresInDisplay = (expiresIn) => {
  if (!expiresIn) return "";
  return `${Math.floor(expiresIn)} seconds`;
};

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
    fontWeight: 500,
  },
  expiredDisplay: {
    fontWeight: 500,
    marginLeft: theme.spacing(0.5),
  },
}));

const ModalBody = React.forwardRef(function ModalBody(
  { classes, expiresIn, disabled, refresh, onReload, onClose },
  ref,
) {
  return (
    <div ref={ref} style={MODAL_STYLE} className={classes.paper}>
      <h2 id="timeout-modal-title">Session Timeout Notice</h2>
      <div id="timeout-modal-description">
        {expiresIn !== null && expiresIn === 0 && (
          <span className="error">Your current session has expired.</span>
        )}
        {expiresIn !== null && expiresIn !== 0 && (
          <React.Fragment>
            {!disabled && (
              <span>
                Your session will expire in approximately
                <span className={classes.expiredDisplay}>
                  {getExpiresInDisplay(expiresIn)}
                </span>
                .
              </span>
            )}
            {disabled && (
              <div>
                <div>Your session is about to expire.</div>
                {refresh && (
                  <div className={classes.infoDescription}>
                    One moment while your browser session is refreshed....
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        )}
        <div className="buttons-container">
          {!disabled && refresh && (
            <Button variant="outlined" onClick={onReload}>
              Refresh Session
            </Button>
          )}
          <Button variant="outlined" onClick={onClose}>
            Dismiss
          </Button>
          <Button
            variant="outlined"
            onClick={() => (window.location = "/logout")}
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
});
ModalBody.propTypes = {
  classes: PropTypes.object.isRequired,
  expiresIn: PropTypes.number,
  disabled: PropTypes.bool.isRequired,
  refresh: PropTypes.bool.isRequired,
  onReload: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};


export default function TimeoutModal() {
  const classes = useStyles();
  const { appSettings } = useSettingContext();

  const [open, setOpen] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);

  const expiredIntervalIdRef = useRef(0);
  const expiresInRef = useRef(null);
  const refreshRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  const openRef = useRef(open);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const clearExpiredIntervalId = useCallback(() => {
    clearInterval(expiredIntervalIdRef.current);
  }, []);

  const handleClose = useCallback(() => {
    clearExpiredIntervalId();
    setOpen(false);
  }, [clearExpiredIntervalId]);

  const reLoad = useCallback(() => {
    handleClose();
    // Force-request a new access token when one is about to expire but still valid
    window.location = "/clear_session";
  }, [handleClose]);

  const handleLogout = useCallback(
    (userInitiated) => {
      clearExpiredIntervalId();
      sessionStorage.clear();
      const param = userInitiated ? "user_initiated=true" : "timeout=true";
      setTimeout(() => {
        window.location = `/logout?${param}`;
      }, 0);
    },
    [clearExpiredIntervalId],
  );

  const checkSessionValidity = useCallback(() => {
    const reTry = () => {
      if (retryAttemptsRef.current < 2) {
        initTimeoutTracking();
        retryAttemptsRef.current++;
        return;
      }
      retryAttemptsRef.current = 0;
      clearExpiredIntervalId();
    };

    if (
      expiresInRef.current !== null &&
      expiresInRef.current > 0 &&
      expiresInRef.current <= TRACK_INTERVAL_MS / 1000
    ) {
      handleLogout();
      return;
    }

    sendRequest("./validate_token").then(
      (response) => {
        if (!response) return;

        let tokenData = null;
        try {
          tokenData = JSON.parse(response);
        } catch (e) {
          console.log(`Error occurred parsing token data ${e}`);
          reTry();
          return;
        }

        const accessTokenExpiresIn = parseFloat(tokenData["access_expires_in"]);
        const refreshTokenExpiresIn = parseFloat(
          tokenData["refresh_expires_in"],
        );
        const refreshTokenOnVentilator =
          (!tokenData["valid"] && refreshTokenExpiresIn === 0) ||
          refreshTokenExpiresIn < accessTokenExpiresIn;

        expiresInRef.current = refreshTokenOnVentilator
          ? refreshTokenExpiresIn
          : accessTokenExpiresIn;

        const tokenAboutToExpire =
          Math.floor(expiresInRef.current) >= 1 &&
          Math.floor(expiresInRef.current) <= 60;

        refreshRef.current = tokenAboutToExpire && !refreshTokenOnVentilator;

        if (!tokenData["valid"] || expiresInRef.current <= 1) {
          if (refreshTokenOnVentilator) {
            handleLogout();
          } else {
            reLoad();
          }
          clearExpiredIntervalId();
          return;
        }

        if (tokenAboutToExpire) {
          if (disabledRef.current) {
            setTimeout(() => {
              if (refreshTokenOnVentilator) handleLogout();
              else reLoad();
            }, 5000);
          }
          if (!openRef.current) setOpen(true);
        }
      },
      (error) => {
        console.log("Error returned ", error);
        if (error?.status === 401) {
          console.log("Failed to retrieve token data: Unauthorized");
          clearExpiredIntervalId();
          handleLogout();
          return;
        }
        console.log(
          "Failed to retrieve token data",
          error?.status ? `status ${error.status}` : "",
        );
        clearExpiredIntervalId();
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearExpiredIntervalId, handleLogout, reLoad]);

  const initTimeoutTracking = useCallback(() => {
    expiredIntervalIdRef.current = setInterval(
      () => checkSessionValidity(),
      TRACK_INTERVAL_MS,
    );
  }, [checkSessionValidity]);

  useEffect(() => {
    clearExpiredIntervalId();
    setDisabled(
      appSettings && appSettings["ENABLE_INACTIVITY_TIMEOUT"] ? false : true,
    );
    initTimeoutTracking();
    return () => clearExpiredIntervalId();
  }, [appSettings, clearExpiredIntervalId, initTimeoutTracking]);

  return (
    <div>
      <Modal
        open={open}
        onClose={handleClose}
        className="timeout-modal"
        aria-labelledby="timeout-modal-title"
        aria-describedby="timeout-modal-description"
      >
        <ModalBody
          classes={classes}
          expiresIn={expiresInRef.current}
          disabled={disabled}
          refresh={refreshRef.current}
          onReload={reLoad}
          onClose={handleClose}
        />
      </Modal>
    </div>
  );
}
