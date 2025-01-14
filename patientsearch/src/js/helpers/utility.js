import differenceInMonths from "date-fns/differenceInMonths";
import isValid from "date-fns/isValid";
import {
  ACCESS_TOKEN_KEY,
  MIN_QUERY_COUNT,
  REALM_ACCESS_TOKEN_KEY,
  noCacheParam,
} from "../constants/consts";

export function toTop() {
  window.scrollTo(0, 0);
}

export function sendRequest(url, params) {
  params = params || {};
  // Return a new promise.
  return new Promise(function (resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open("GET", url);
    if (params.nocache) {
      // via Cache-Control header:
      req.setRequestHeader("Cache-Control", "no-cache");
    }

    req.onload = function () {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.response);
      } else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(req);
      }
    };

    // Handle network errors
    req.onerror = function () {
      reject(req);
    };

    // Make the request
    req.send();
  });
}

/*
 * helper function for retrieving data via ajax
 */
export async function fetchData(url, params, errorCallback) {
  const MAX_WAIT_TIME = 20000;
  params = params || {};
  errorCallback = errorCallback || function () {};
  // Create a promise that rejects in maximum wait time in milliseconds
  let timeoutPromise = new Promise((resolve, reject) => {
    let id = setTimeout(() => {
      clearTimeout(id);
      reject(`Timed out in ${MAX_WAIT_TIME} ms.`);
    }, MAX_WAIT_TIME);
  });
  /*
   * if for some reason fetching the request data doesn't resolve or reject withing the maximum waittime,
   * then the timeout promise will kick in
   */
  let json = null;
  let results = await Promise.race([fetch(url, params), timeoutPromise]).catch(
    (e) => {
      console.log("url ", url);
      console.log("params ", params);
      console.log("error retrieving data ", e);
      errorCallback(e);
      throw e;
    }
  );
  try {
    //read response stream
    json = await results.json().catch((e) => {
      console.log("There was error processing data.");
      throw e.message;
    });
    //console.log("response json ", json);
  } catch (e) {
    console.log(`There was error parsing data:`, e);
    json = null;
  }

  if (!results || !results.ok) {
    console.log("no results returned ", results);
    if (!results.ok) {
      console.log("Error results ", results);
      const errorMessage =
        json && json.message
          ? json.message
          : results && results.status
          ? "Status code: " + results.status
          : "Error occurred retrieving data";
      errorCallback(errorMessage, results.status);
      throw errorMessage;
    }
    return null;
  }

  return json;
}
/*
 * return application settings in JSON
 */
export async function getSettings(callback, noCache) {
  callback = callback || function () {};
  const today = new Date();
  const settingStorageKey =
    "FEMR_APP_SETTINGS_" +
    today.getFullYear() +
    pad(today.getMonth()) +
    pad(today.getDate()) +
    pad(today.getMinutes());
  if (!noCache && sessionStorage.getItem(settingStorageKey)) {
    let cachedSetting = JSON.parse(sessionStorage.getItem(settingStorageKey));
    callback(cachedSetting);
    return cachedSetting;
  }
  const response = await fetch("./settings").catch((e) => {
    callback({ error: e });
  });
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    callback({ error: e });
  }
  if (data && Object.keys(data).length) {
    sessionStorage.setItem(settingStorageKey, JSON.stringify(data));
  }
  callback(data);
  return data;
}

export function dateFormat(input) {
  if (input == null) return "";
  return new Date(input).toDateString();
}

/*
 * example input: 2021-09-14T17:52:28.365+00:00 output: 2021-09-14 17:52 */
export function isoShortDateFormat(input) {
  if (!input) return "";
  //remove milliseconds
  let string1 = input.substring(0, input.indexOf("."));
  //remove seconds
  string1 = string1.substring(0, string1.lastIndexOf(":")).replace("T", " ");
  return string1;
}

export function imageOK(img) {
  if (!img) {
    return false;
  }
  if (!img.getAttribute("src")) {
    return false;
  }
  if (!img.complete) {
    return false;
  }
  if (typeof img.naturalWidth !== "undefined" && img.naturalWidth === 0) {
    return false;
  }
  return true;
}

export function getUrlParameter(name, queryString) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(queryString ? queryString : location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

export function isString(obj) {
  return Object.prototype.toString.call(obj) === "[object String]";
}

export function pad(val, len) {
  if (!val && parseInt(val) !== 0) return "";
  val = String(val);
  len = len || 2;
  while (val.length < len) val = "0" + val;
  return val;
}

/*
 * convert a UTC date/time string to local date/time string in YYYY-MM-DD HH:MM format
 * example: 2021-10-01T20:31:35.917+00:00 to 2021-10-01 13:31
 */
export function getLocalDateTimeString(utcDateString, shortFormat) {
  if (!utcDateString) return "";
  //note javascript Date object automatically convert UTC date/time to locate date/time, no need to parse and convert
  let dateObj =
    utcDateString instanceof Date ? utcDateString : new Date(utcDateString);
  if (!isValid(dateObj) || isNaN(dateObj)) return utcDateString;
  let year = dateObj.getFullYear();
  let month = pad(dateObj.getMonth() + 1);
  let day = pad(dateObj.getDate());
  let hours = pad(dateObj.getHours());
  let minutes = pad(dateObj.getMinutes());
  if (shortFormat) return `${year}-${month}-${day}`;
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/*
 *  given two date/time string, sort it in descending order
 */
export function dateTimeCompare(a, b) {
  if (a == null && b != null) {
    return 1;
  } else if (a != null && b == null) {
    return -1;
  } else if (a == null && b == null) {
    return 0;
  }
  a = new Date(a).getTime();
  b = new Date(b).getTime();
  return b > a ? 1 : -1;
}

/*
 * add n number of years to a date object
 */
export function addYearsToDate(dt, n) {
  if (!(dt instanceof Date)) {
    let arrDates = getShortDateFromISODateString(dt).split("-");
    dt = new Date(arrDates[0], arrDates[1] - 1, arrDates[2]);
  }
  dt.setFullYear(dt.getFullYear() + n);
  return dt;
}

/*
 * check if two dates are within specified number of months
 */
export function isInMonthPeriod(dateFrom, dateTo, numOfMonths) {
  let months = differenceInMonths(dateTo, dateFrom);
  return months >= 0 && months <= numOfMonths;
}

/*
 * determine if the firstDate is in the past from the secondDate
 */
export function isDateInPast(firstDate, secondDate) {
  if (!(firstDate instanceof Date)) firstDate = new Date(firstDate);
  if (!(secondDate instanceof Date)) secondDate = new Date(secondDate);
  if (firstDate.setHours(0, 0, 0, 0) <= secondDate.setHours(0, 0, 0, 0)) {
    return true;
  }
  return false;
}

/*
 * return a date string in YYYY-MM-DD formate
 */
export function getShortDateFromISODateString(dateString) {
  if (!dateString) return "";
  let TIndex = dateString.indexOf("T");
  if (TIndex > 0) return dateString.substring(0, TIndex);
  return dateString;
}

/*
 * return age based on date string
 */
export function getAge(birthDateString) {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  const yearsDifference = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate())
  ) {
    return yearsDifference - 1;
  }
  return yearsDifference;
}

/*
 * determine whether datestring is greater than 18 in age
 */
export function isAdult(birthDateString) {
  return getAge(birthDateString) >= 18;
}

/*
 * given a date string in YYYY-MM-DD format
 * pad 0 for month and day fields where applicable
 */
export function padDateString(dateString) {
  if (!dateString) return "";
  dateString = dateString.trim();
  if (!isValid(new Date(dateString))) return dateString;
  let arrDate = dateString.split("-");
  let year = arrDate[0];
  let month = pad(arrDate[1]);
  let day = pad(arrDate[2]);
  return [year, month, day].join("-");
}

export async function validateToken() {
  const response = await fetch("./validate_token");
  if (!response.ok) {
    throw response;
  }
  const tokenData = await response.json();
  if (
    !tokenData ||
    (tokenData &&
      (!tokenData.valid ||
        parseInt(tokenData.access_expires_in) <= 0 ||
        parseInt(tokenData.refresh_expires_in) <= 0))
  ) {
    return false;
  }
  return tokenData;
}

export function getRolesFromToken(tokenObj) {
  const token = tokenObj || {};
  let roles = [];
  if (
    token[ACCESS_TOKEN_KEY] &&
    token[ACCESS_TOKEN_KEY][REALM_ACCESS_TOKEN_KEY]
  ) {
    const realmAccessObj = token[ACCESS_TOKEN_KEY][REALM_ACCESS_TOKEN_KEY];
    if (realmAccessObj["roles"]) {
      roles = [...roles, ...realmAccessObj["roles"]];
    }
  }
  return roles;
}

export function getAccessToken(tokenObj) {
  const token = tokenObj || {};
  if (!token || !token[ACCESS_TOKEN_KEY]) return null;
  return token[ACCESS_TOKEN_KEY];
}

export function getEmailFromToken(tokenObj) {
  const token = getAccessToken(tokenObj) || {};
  return token.email;
}

export function getPreferredUserNameFromToken(tokenObj) {
  const token = getAccessToken(tokenObj) || {};
  return token["preferred_username"];
}

export function getClientsByRequiredRoles(sofClients, currentRoles) {
  if (!sofClients) {
    return;
  }
  //CHECK user role(s) against each SoF client app's REQUIRED_ROLES
  return sofClients.filter((item) => {
    const requiredRoles = item["required_roles"] || item["REQUIRED_ROLES"];
    if (!requiredRoles) return true;
    if (Array.isArray(requiredRoles) && !Array.isArray(currentRoles))
      return requiredRoles.indexOf(currentRoles) !== -1;
    if (!Array.isArray(requiredRoles) && Array.isArray(currentRoles))
      return currentRoles.filter((role) => role === currentRoles).length > 0;
    if (Array.isArray(requiredRoles) && Array.isArray(currentRoles))
      return (
        requiredRoles.filter((role) => currentRoles.indexOf(role) !== -1)
          .length > 0
      );
    return requiredRoles === currentRoles;
  });
}

export function handleExpiredSession() {
  sessionStorage.clear();
  setTimeout(() => {
    // /home is a protected endpoint, the backend will request a new Access Token from Keycloak if able, else prompt a user to log in again
    window.location = "/home";
  }, 0);
}

export function setDocumentTitle(title) {
  if (!title) return;
  document.title = title;
}

export function setFavicon(href) {
  if (!href) return;
  let faviconEl = document.querySelector("link[rel*='icon']");
  if (!faviconEl) return;
  faviconEl.href = href;
}

export function isEmptyArray(arrObj) {
  return !arrObj || !Array.isArray(arrObj) || arrObj.length === 0;
}

/*
 * helper function for updating patient data via a PUT method call to FHIR host API
 * @param patientId, Id of the patient whose data will be updated
 * @param data, request payload
 * @errorCallback, callback function to be called if error occurs
 * @successCallback, callback function to be called if the request
 */
export function putPatientData(
  patientId,
  data,
  errorCallback,
  successCallback
) {
  if (!patientId || !data) return;
  fetchData(
    "/fhir/Patient/" + patientId,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
    (e) => {
      if (errorCallback) errorCallback(e);
    }
  ).then(() => {
    console.log("PUT complete for patient " + patientId);
    if (successCallback) successCallback();
  });
}

export function addMamotoTracking(siteId, userId) {
  if (document.querySelector("#matomoScript")) return;
  // no site ID specified, not proceeding
  if (!siteId) return;
  window._paq = [];
  window._paq.push(["trackPageView"]);
  window._paq.push(["enableLinkTracking"]);
  if (siteId) {
    window._paq.push(["setSiteId", siteId]);
  }
  if (userId) {
    window._paq.push(["setUserId", userId]);
  }

  let u = "https://piwik.cirg.washington.edu/";
  window._paq.push(["setTrackerUrl", u + "matomo.php"]);
  let d = document,
    g = d.createElement("script"),
    headElement = document.querySelector("head");
  g.type = "text/javascript";
  g.async = true;
  g.defer = true;
  g.setAttribute("src", u + "matomo.js");
  g.setAttribute("id", "matomoScript");
  headElement.appendChild(g);
}

/*
 * @param dateString of type String
 * @returns true if supplied dateString is determined to be less than today's date otherwise false
 */
export function isInPast(dateString) {
  if (!dateString) return false;
  const today = new Date();
  const targetDate = new Date(dateString);
  if (!isValid(targetDate)) return false;
  const diff = (today - targetDate); // in miniseconds
  return diff > (1000 * 60 * 5); // this will check if diff is 5 minutes or more
}

/*
 * @param objDate of type Date object
 * @returns text display of time ago as string e.g. < 50 seconds, < 1 hour, 1 day 2 hours, 3 hours, 3 days
 */
export function getTimeAgoDisplay(objDate) {
  if (!objDate || !isValid(objDate)) return null;
  const today = new Date();
  const total = today - objDate;
  // future date
  if (total < 0) return null;
  const seconds = Math.floor((today - objDate) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 5) {
    return "now";
  } else if (seconds < 60) {
    return `< ${seconds} second${seconds > 1 ? "s" : ""}`;
  } else if (minutes < 60) {
    return `< 1 hour`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""}`.trim();
  } else {
    if (days >= 1) {
      const hoursRemain = Math.floor((total / (1000 * 60 * 60)) % 24);
      return `${days} day${days > 1 ? "s" : ""} ${
        hoursRemain > 0
          ? hoursRemain + " hour" + (hoursRemain > 1 ? "s" : "")
          : ""
      }`.trim();
    }
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
}

/*
 * @param patientId, Id for the patient
 * @param params, parameters required for launching an app
 * @return {string} url for launching the client app
 */
export const getAppLaunchURL = (patientId, params) => {
  if (!patientId) {
    console.log("Missing information: patient Id");
    return "";
  }
  const launchParams = params ? params : {};
  const iss = launchParams["SOF_HOST_FHIR_URL"];
  const needPatientBanner = launchParams["NEED_PATIENT_BANNER"];
  const launchURL = launchParams["launch_url"];
  if (!launchURL || !iss) {
    console.log("Missing ISS launch base URL");
    return "";
  }
  const arrParams = [
    `patient=${patientId}`,
    `need_patient_banner=${needPatientBanner}`,
    `launch=${btoa(JSON.stringify({ a: 1, b: patientId }))}`,
    `iss=${encodeURIComponent(iss)}`,
  ];
  return `${launchURL}?${arrParams.join("&")}`;
};

/*
 * look up CareTeam and Patient FHIR resources containing the practitioner ID
 * @param practitionerId practitioner id (as id from the Practitioner FHIR resource)
 * @return {array<string> | null} array of patient ids or null
 */
export async function getPatientIdsByCareTeamParticipant(practitionerId) {
  if (!practitionerId) return null;
  const results = await Promise.allSettled([
    fetchData(
      `/fhir/Patient?general-practitioner=Practitioner/${practitionerId}&_count=${MIN_QUERY_COUNT}`,
      noCacheParam,
      (error) => {
        if (error) {
          console.log(
            "Error retrieving patient resources by practitioner id ",
            error
          );
          return null;
        }
      }
    ),
    fetchData(
      `/fhir/CareTeam?participant=Practitioner/${practitionerId}&_count=${MIN_QUERY_COUNT}`,
      noCacheParam,
      (error) => {
        if (error) {
          console.log("Error retrieving careteam by practitioner id ", error);
          return null;
        }
      }
    ),
  ]).catch((e) => {
    console.log("Error retrieving patients followed by practitioner ", e);
    return null;
  });
  console.log(
    "Query results for patients the practitioner is following: ",
    results
  );
  let combinedResults = [];
  // Patient resources
  if (results[0].value && !isEmptyArray(results[0].value.entry)) {
    let arrIds = results[0].value.entry.map((o) => o.resource.id);
    combinedResults = [...arrIds];
  }
  // CareTeam resources
  if (results[1].value && !isEmptyArray(results[1].value.entry)) {
    let arrIds = results[1].value.entry
      .filter(
        (o) => o.resource && o.resource.subject && o.resource.subject.reference
      )
      .map((o) => o.resource.subject.reference.split("/")[1]);
    combinedResults = [...combinedResults, ...arrIds];
  }
  if (!isEmptyArray(combinedResults)) {
    // ids without duplicates
    return [...new Set(combinedResults)];
  }
  return null;
}

/*
 * return true if queryString URL contains specified flag, e.g. flags=[flagId]
 * @param flagId, value for the query string, flags
 * @return boolean
 */
export function hasFlagForCheckbox(flagId) {
  const flagQueryString = getUrlParameter("flags");
  if (!flagQueryString) return false;
  if (!flagId) return false;
  return flagQueryString === flagId;
}

/*
 * return first resource in a bundled FHIR resource data
 * @param FHIR resource bundle
 * @return FHIR object
 */
export function getFirstResourceFromFhirBundle(bundle) {
  if (!bundle) return null;
  if (!bundle.entry) {
    if (Array.isArray(bundle)) {
      if (bundle.length) return bundle[0];
      else return null;
    }
    if (bundle.resource) return bundle.resource;
    return bundle;
  }
  const firstEntry = Array.isArray(bundle.entry)
    ? bundle.entry.length
      ? bundle.entry[0]
      : null
    : bundle.entry;
  if (firstEntry.resource) return firstEntry.resource;
  return firstEntry;
}

/*
 * return error text from diagnostic element in a FHIR response data
 * @param FHIR response data
 * @return string
 */
export function getErrorDiagnosticTextFromResponse(response) {
  const issue =
    response &&
    response.issue &&
    Array.isArray(response.issue) &&
    response.issue.find((item) => item.severity === "error");
  return issue && issue.diagnostics ? issue.diagnostics : "";
}

/*
 * return string with first letter capitalized and the rest lower cased
 * @param string to be modified
 * @return string
 */
export function capitalizeFirstLetter(string) {
  if (!string) return "";
  const firstCapLetter = string.charAt(0).toUpperCase();
  const theRest = string.slice(1);
  return firstCapLetter + (theRest ? theRest.toLowerCase() : "");
}

/*
 * return sorted array of resource entries by ID from a FHIR bundle result
 * @param FHIR bundle result
 * @return array
 */
export function getSortedEntriesFromBundle(bundle) {
  if (!bundle || isEmptyArray(bundle)) return [];
  return bundle
    .filter((item) => item.resource)
    .map((item) => item.resource)
    .sort((a, b) => parseInt(b.id) - parseFloat(a.id));
}

/*
 * return array of active resource entries from a Patient FHIR bundle result
 * @param FHIR bundle result
 * @return array
 */
export function getActiveEntriesFromPatientBundle(bundle) {
  if (!bundle || isEmptyArray(bundle)) return [];
  return bundle.filter((item) => {
    if (typeof item.active === "undefined") {
      return true;
    }
    return String(item.active).toLowerCase() === "true";
  });
}

/*
 * return array of inactive resource entries from a Patient FHIR bundle result
 * @param FHIR bundle result
 * @return array
 */
export function getInactiveEntriesFromPatientBundle(bundle) {
  if (!bundle || isEmptyArray(bundle)) return [];
  return bundle.filter((item) => {
    if (typeof item.active === "undefined") {
      return true;
    }
    return String(item.active).toLowerCase() !== "true";
  });
}
