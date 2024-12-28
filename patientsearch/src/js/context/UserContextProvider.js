import React, { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import CircularProgress from "@mui/material/CircularProgress";
import Error from "../components/Error";
import {
  fetchData,
  getEmailFromToken,
  getPatientIdsByCareTeamParticipant,
  getPreferredUserNameFromToken,
  getRolesFromToken,
  getAccessToken,
  isString,
  validateToken,
} from "../helpers/utility";
import { noCacheParam } from "../constants/consts";
const UserContext = React.createContext({});
/*
 * context component that allows user info to be accessible to its children component(s)
 */
export default function UserContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const handleErrorCallback = (e) => {
    if (parseInt(e) === 401) {
      setErrorMessage("Unauthorized");
      window.location = "/logout?unauthorized=true";
      return;
    }
    setErrorMessage(
      isString(e)
        ? e
        : e && e.message
        ? e.message
        : "Error occurred processing user data"
    );
  };
  useEffect(() => {
    validateToken().then(
      async (data) => {
        if (!data || data.error) {
          setErrorMessage("no token data");
          return false;
        }
        const roles = getRolesFromToken(data);
        const email = getEmailFromToken(data);
        const userName = getPreferredUserNameFromToken(data);
        const accessToken = getAccessToken(data);
        const { family_name, given_name } = accessToken;
        const userObj = {
            roles: roles,
            email: email,
            username: userName,
            name: accessToken.name,
            familyName: family_name,
            givenName: given_name,
        };
        // get/set practitioner id
        let practitionerId = null;
        const baseURL = "/fhir/Practitioner";
        let requestURLs = [];
        if (email) requestURLs.push(baseURL + "?telecom=" + encodeURIComponent(email));
        if (family_name && given_name) {
          requestURLs.push(
            baseURL +
              "?family=" +
              encodeURIComponent(family_name) +
              "&given=" +
              encodeURIComponent(given_name)
          );
        }
        // try looking up matched practitioner resource by name or email
        const allResults = await Promise.all(
          requestURLs.map((item) => fetchData(item, noCacheParam))
        ).catch(e => {
          console.log("fetch practitioner error ", e);
          setUser(userObj);
          handleErrorCallback(e);
        });
        if (!allResults || !allResults.length) {
          setUser(userObj);
          return;
        }
        const filteredResults = allResults.filter(
            (item) => item.entry && item.entry.length > 0
        );
        if (filteredResults.length) {
            practitionerId = filteredResults[0].entry[0].resource.id;
            // NOTE - retrieving id(s) of patients whose care team the practitioner is part of
            getPatientIdsByCareTeamParticipant(practitionerId).then(
              (result) => {
                setUser({
                  ...userObj,
                  practitionerId: practitionerId,
                  followingPatientIds: result && result.length ? result : null
                });
              }
            ).catch((e) => {
              setUser(userObj);
              handleErrorCallback(e);
            });
        } else {
          setUser(userObj);
          handleErrorCallback("Practitioner resource lookup failed. We are not able to find you in the system.");
        }
      },
      (e) => {
        console.log("token validation error ", e);
        handleErrorCallback(401);
      }
    );
  }, []);
  return (
    <UserContext.Provider value={{ user: user, userError: errorMessage }}>
      <UserContext.Consumer>
        {({ user, userError }) => {
          if (user || userError) return children;
          return (
            <>
              <div style={{ display: "flex", gap: "16px 16px", padding: "24px" }}>
                Loading ...
                <CircularProgress color="primary"></CircularProgress>
              </div>
            </>
          );
        }}
      </UserContext.Consumer>
    </UserContext.Provider>
  );
}
UserContextProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.element]),
};
/*
 * helper function to access user context
 */
export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("Context must be used within a Provider");
  }
  return context;
}
