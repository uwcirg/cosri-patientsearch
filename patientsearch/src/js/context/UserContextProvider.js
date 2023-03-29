import React, { useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import CircularProgress from "@material-ui/core/CircularProgress";
import Error from "../components/Error";
import {
  fetchData,
  getEmailFromToken,
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
    setErrorMessage(
      isString(e)
        ? e
        : e && e.message
        ? e.message
        : "Error occurred processing data"
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
        let practitionerId = null;
        //console.log("roles ", roles);
        //console.log("emails ", email);
        //console.log("name ", userName);
        if (email) {
          const lookupResults = await fetchData(
            "/fhir/Practitioner?email=" + email,
            noCacheParam
          );
          if (lookupResults.entry && lookupResults.entry.length) {
            practitionerId = lookupResults.entry[0].resource.id;
          }
          //console.log("lookup results ", lookupResults);
        }
        setUser({
          roles: roles,
          email: email,
          username: userName,
          name: accessToken.name,
          practitionerId: practitionerId,
        });
      },
      (e) => {
        console.log("token validation error ", e);
        handleErrorCallback(e);
      }
    );
  }, []);
  return (
    <UserContext.Provider value={{ user: user, error: errorMessage }}>
      <UserContext.Consumer>
        {({ user, error }) => {
          if (user || error) return children;
          return (
            <div style={{ display: "flex", gap: "16px 16px", padding: "24px" }}>
              Loading ...
              <CircularProgress color="primary"></CircularProgress>
            </div>
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
