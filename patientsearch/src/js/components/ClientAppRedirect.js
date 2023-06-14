import { useEffect } from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import { useSettingContext } from "../context/SettingContextProvider";
import { getAppLaunchURL, getUrlParameter } from "../helpers/utility";
import Alert from "../components/Alert";

export default function ClientAppRedirect() {
  const settingsCtx = useSettingContext();
  const appSettings = settingsCtx.appSettings || {};
  //sample URL: /target?sof_client_id=MESSAGING&patient=2
  const patientId = getUrlParameter("patient");
  console.log("Patient Id from URL parameter ", patientId);

  const getTargetClientLaunchURL = () => {
    const sofClientId = getUrlParameter("sof_client_id");
    console.log("SOF client ID from URL parameter ", sofClientId);
    if (!sofClientId) return null;

    const softClients = appSettings["SOF_CLIENTS"];
    if (!softClients || !softClients.length) return null;

    if (softClients.length === 1) return softClients[0].launch_url;

    const matchedClient = softClients.find(
      (client) =>
        String(client.id).toLowerCase() === String(sofClientId).toLowerCase()
    );
    if (matchedClient) return matchedClient.launch_url;

    return null;
  };
  const targetAppURL = getAppLaunchURL(
    patientId,
    getTargetClientLaunchURL(),
    appSettings
  );
  const allowToLaunch = patientId && targetAppURL;
  const renderError = (message) => {
    return <Alert message={message} elevation={0}></Alert>;
  };

  useEffect(() => {
    if (allowToLaunch) {
      console.log("client app launch URL ", targetAppURL);
      setTimeout(() => (window.location = targetAppURL), 250);
    }
  }, []);

  return (
    <div className="content-container">
      {!patientId && renderError("No patient id specified.")}
      {!targetAppURL &&
        renderError(
          "Invalid or mis-configured SOF client specified.  Unable to retrieve launch URL."
        )}
      {allowToLaunch && (
        <div className="flex">
          <CircularProgress></CircularProgress>
          <div>Loading...</div>
        </div>
      )}
    </div>
  );
}
