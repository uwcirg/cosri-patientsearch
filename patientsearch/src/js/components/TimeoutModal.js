import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  Box,
  Button,
  Modal,
  Typography,
  Paper,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { sendRequest } from "../helpers/utility";
import { useSettingContext } from "../context/SettingContextProvider";

const TRACK_INTERVAL_MS = 15000;
const WARNING_THRESHOLD_SEC = 60;

const ModalBody = React.forwardRef(
  ({ expiresIn, isRefreshing, onReload, onClose }, ref) => {
    const progress = Math.max(
      0,
      Math.min(100, (expiresIn / WARNING_THRESHOLD_SEC) * 100),
    );
    const isCritical = expiresIn < 15;

    return (
      <Paper
        ref={ref}
        tabIndex={-1}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 480,
          bgcolor: "background.paper",
          border: "2px solid",
          borderColor: isCritical ? "error.main" : "primary.main",
          boxShadow: 24,
          p: 4,
          outline: "none",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Session Timeout Notice
        </Typography>

        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={isCritical ? "error" : "primary"}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        <Box>
          <Typography variant="body1">
            {expiresIn <= 0
              ? "Your session has expired."
              : `Your session will expire in ${Math.floor(expiresIn)} seconds.`}
          </Typography>

          <Box
            sx={{ mt: 4, display: "flex", gap: 1, justifyContent: "flex-end" }}
          >
            <Button
              variant="contained"
              onClick={onReload}
              disabled={isRefreshing || expiresIn <= 0}
              sx={{ fontWeight: 600, minWidth: 145 }}
              startIcon={
                isRefreshing ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {isRefreshing ? "Refreshing..." : "Extend Session"}
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              onClick={onClose}
              disabled={isRefreshing}
            >
              Dismiss
            </Button>

            <Button
              variant="text"
              color="error"
              onClick={() => (window.location.href = "/logout")}
              disabled={isRefreshing}
            >
              Log Out
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  },
);

export default function TimeoutModal() {
  const { appSettings } = useSettingContext();
  const [open, setOpen] = useState(false);
  const [expiresIn, setExpiresIn] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const reLoad = useCallback(() => {
    setIsRefreshing(true);
    window.location.href = "/clear_session";
  }, []);

  const checkSessionValidity = useCallback(async () => {
    if (isRefreshing) return;

    try {
      const response = await sendRequest("./validate_token");
      if (!response) return;

      const tokenData = JSON.parse(response);
      const accessExp = parseFloat(tokenData.access_expires_in);
      const refreshExp = parseFloat(tokenData.refresh_expires_in);

      const currentExpiry =
        !tokenData.valid && refreshExp === 0
          ? 0
          : Math.min(accessExp, refreshExp);

      setExpiresIn(currentExpiry);


      if (currentExpiry <= 0) {
        window.location.href = "/logout?timeout=true";
      } else if (currentExpiry <= WARNING_THRESHOLD_SEC) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    } catch (e) {
      console.error("Session check failed", e);
    }
  }, [isRefreshing]);

  useEffect(() => {
    intervalRef.current = setInterval(checkSessionValidity, TRACK_INTERVAL_MS);
    checkSessionValidity();
    return () => clearInterval(intervalRef.current);
  }, [appSettings, checkSessionValidity]);

  useEffect(() => {
    if (open && expiresIn > 0 && !isRefreshing) {
      countdownRef.current = setInterval(() => {
        setExpiresIn((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [open, expiresIn, isRefreshing]);

  return (
    <Modal
      open={open}
      onClose={() => !isRefreshing && setOpen(false)}
      aria-labelledby="timeout-modal-title"
      aria-describedby="timeout-modal-description"
    >
      <ModalBody
        expiresIn={expiresIn}
        isRefreshing={isRefreshing}
        onReload={reLoad}
        onClose={() => setOpen(false)}
      />
    </Modal>
  );
}
