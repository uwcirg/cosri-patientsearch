import React, {useEffect} from "react";
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Modal from '@material-ui/core/Modal';
import {sendRequest} from './Utility';

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
    position: 'absolute',
    width: 400,
    backgroundColor: theme.palette.background.paper,
    border: `2px solid ${theme.palette.primary.main}`,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
}));

let expiredIntervalId = 0;
let expiresIn = null;

export default function TimeoutModal() {
  const classes = useStyles();
  const [modalStyle] = React.useState(getModalStyle);
  const [open, setOpen] = React.useState(false);
  const trackInterval = 15000;

  const clearExpiredIntervalId = () => {
    clearInterval(expiredIntervalId);
  };

  const checkSessionValidity = () => {
    /*
     * when the expires in is less than the next track interval, the session will have expired, so just logout user
     */
    if (expiresIn && 
      expiresIn > 0 &&
      expiresIn <= (trackInterval/1000)) {
        handleLogout();
        return;
    }
    sendRequest("./validate_token").then(response => {
      if (response) {
        let tokenData = null;
        try {
          tokenData = JSON.parse(response);
          //in seconds
          expiresIn = tokenData["expires_in"];
         
          if (!tokenData["valid"] || expiresIn <= 1) {
            handleLogout();
            return;
          }
          if (Math.floor(expiresIn) <= 60) {
            cleanUpModal();
            if (!open) handleOpen();
          }
 
        } catch(e) {
          console.log(`Error occurred parsing token data ${e}`);
          clearExpiredIntervalId();
          return;
        }

      }
    },
    error => {
      if (error.status && error.status == 401) {
        console.log("Failed to retriev token data: Unauthorized ");
        handleLogout();
        return;
      }
      clearExpiredIntervalId();
      console.log("Failed to retrieve token data", error.statusText);
    });
  };

  const initTimeoutTracking = () => {
    expiredIntervalId = setInterval(() => checkSessionValidity(), trackInterval);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    clearExpiredIntervalId();
    setTimeout(() => {
      window.location = "/logout";
    }, 0);
    return false;
  }

  const getExpiresInDisplay = (expiresIn) => {
    if (!expiresIn) return "";
    return `${Math.floor(expiresIn)} seconds`;
  }

  const cleanUpModal = () => {
    let modalElement = document.querySelector(".timeout-modal");
    if (modalElement) {
      modalElement.parentNode.removeChild(modalElement);
    }
  }
  const body = (
    <div style={modalStyle} className={classes.paper}>
      <h2 id="timeout-modal-title">Session Timeout Notice</h2>
      <div id="timeout-modal-description">
          {
            expiresIn && 
            expiresIn == 0 && 
            <span className="error">Your current session has expired.</span>
          }
          {
            expiresIn && 
            expiresIn != 0 && 
            <span>Your session will expired in approximately {getExpiresInDisplay(expiresIn)}.</span>
          }   
          <div className="buttons-container">
            <Button variant="outlined" onClick={handleClose}>OK</Button>
            <Button variant="outlined" onClick={handleLogout}>Log Out</Button>
          </div>
      </div>
      <TimeoutModal />
    </div>
  );
  
  useEffect(() => {
    initTimeoutTracking();
    return () => {
      clearExpiredIntervalId();
    }
  }, []);
  
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
