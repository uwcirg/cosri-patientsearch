import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import PropTypes from "prop-types";
import {
  fetchData,
  getEmailFromToken,
  getPatientIdsByCareTeamParticipant,
  getPreferredUserNameFromToken,
  getRolesFromToken,
  getAccessToken,
  getSettings,
  isString,
  validateToken,
} from "../helpers/utility";
import { noCacheParam, objErrorStatus } from "../constants/consts";
import Loader from "../components/Loader";

const SettingContext = React.createContext({});
const UserContext = React.createContext({});


export default function AppContextProvider({ children }) {
  // ---- settings state ----
  const [appSettings, setAppSettings] = useState(null);

  // ---- user state ----
  const [user, setUser] = useState(null);
  const [userError, setUserError] = useState("");

  const hasAppSettings = useCallback(
    () => appSettings && Object.keys(appSettings).length > 0,
    [appSettings],
  );
  const getAppSettingByKey = useCallback(
    (key) => appSettings?.[key] ?? null,
    [appSettings],
  );

  const handleUserErrorCallback = useCallback((e) => {
    const status = parseInt(e?.status);
    const oStatus = objErrorStatus[status];
    if (oStatus) {
      // eslint-disable-next-line react-compiler/react-compiler -- immediate hard navigation on auth/session error, not memoized render logic
      window.location = oStatus.logoutURL;
      return;
    }
    setUserError(
      isString(e)
        ? e
        : e && e.message
          ? e.message
          : "Error occurred processing requested data",
    );
  }, []);

  // settings
  useEffect(() => {
    getSettings((data) => {
      setAppSettings(data && !data.error ? data : {});
    });
  }, []);

  // user/token, fires in parallel with settings above
  useEffect(() => {
    validateToken().then(
      async (data) => {
        if (!data || data.error) {
          setUserError("no token data");
          return;
        }
        const roles = getRolesFromToken(data);
        const email = getEmailFromToken(data);
        const userName = getPreferredUserNameFromToken(data);
        const accessToken = getAccessToken(data);
        const { family_name, given_name } = accessToken;
        const userObj = {
          roles,
          email,
          username: userName,
          name: accessToken.name,
          familyName: family_name,
          givenName: given_name,
        };

        let practitionerId = null;
        const baseURL = "/fhir/Practitioner";
        const requestURLs = [];
        if (email)
          requestURLs.push(baseURL + "?telecom=" + encodeURIComponent(email));
        if (family_name && given_name) {
          requestURLs.push(
            baseURL +
              "?family=" +
              encodeURIComponent(family_name) +
              "&given=" +
              encodeURIComponent(given_name),
          );
        }

        const allResults = await Promise.all(
          requestURLs.map((item) => fetchData(item, noCacheParam)),
        ).catch((e) => {
          console.log("fetch practitioner error ", e);
          setUser(userObj);
          handleUserErrorCallback(e);
        });

        if (!allResults || !allResults.length) {
          setUser(userObj);
          return;
        }

        const filteredResults = allResults.filter(
          (item) => item.entry && item.entry.length > 0,
        );

        if (filteredResults.length) {
          practitionerId = filteredResults[0].entry[0].resource.id;
          getPatientIdsByCareTeamParticipant(practitionerId)
            .then((result) => {
              setUser({
                ...userObj,
                practitionerId,
                followingPatientIds: result && result.length ? result : null,
              });
            })
            .catch((e) => {
              setUser(userObj);
              handleUserErrorCallback(e);
            });
        } else {
          setUser(userObj);
          handleUserErrorCallback(
            "Practitioner resource lookup failed. We are not able to find you in the system.",
          );
        }
      },
      (e) => {
        console.log("token validation error ", e);
        handleUserErrorCallback(e);
      },
    );
  }, [handleUserErrorCallback]);

  const settingContextValue = useMemo(
    () => ({ appSettings, setAppSettings, hasAppSettings, getAppSettingByKey }),
    [appSettings, hasAppSettings, getAppSettingByKey],
  );

  const userContextValue = useMemo(
    () => ({ user, userError }),
    [user, userError],
  );

  const settingsReady = !!appSettings;
  const userReady = !!(user || userError);

  if (!settingsReady || !userReady) {
    return <Loader />;
  }

  return (
    <SettingContext.Provider value={settingContextValue}>
      <UserContext.Provider value={userContextValue}>
        {children}
      </UserContext.Provider>
    </SettingContext.Provider>
  );
}
AppContextProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.element]),
};

export function useSettingContext() {
  const context = useContext(SettingContext);
  if (context === undefined) {
    throw new Error("Context must be used within a Provider");
  }
  return context;
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("Context must be used within a Provider");
  }
  return context;
}
