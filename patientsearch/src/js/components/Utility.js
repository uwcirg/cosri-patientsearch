import differenceInMonths from "date-fns/differenceInMonths";
import isValid from "date-fns/isValid";

export function sendRequest (url, params) {
    params = params || {};
    // Return a new promise.
    return new Promise(function(resolve, reject) {
      // Do the usual XHR stuff
      var req = new XMLHttpRequest();
      req.open("GET", url);
      if (params.nocache) {
        // via Cache-Control header:
        req.setRequestHeader("Cache-Control", "no-cache");
      }

      req.onload = function() {
        // This is called even on 404 etc
        // so check the status
        if (req.status == 200) {
          // Resolve the promise with the response text
          resolve(req.response);
        }
        else {
          // Otherwise reject with the status text
          // which will hopefully be a meaningful error
          reject(req);
        }
      };

      // Handle network errors
      req.onerror = function() {
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
  errorCallback = errorCallback || function() {};
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
  let results = await Promise.race([
    fetch(url, params),
    timeoutPromise
  ]).catch(e => {
      console.log("error retrieving data ", e);
      errorCallback(e);
      throw e;
  });

  if (!results || !results.ok) {
    console.log("no results returned ", results);
    errorCallback(results ? results : "error retrieving data");
    if (!results.ok) {
      throw "There was error processing data. " + (results && results.status ? "Status code: " + results.status : "");
    }
    return null;
  }

  try {
    //read response stream
    json = await (results.json()).catch(e => {
        console.log("There was error processing data.");
        throw e.message;
    });
  } catch(e) {
    console.log(`There was error parsing data: ${e}`);
    json = null;
    errorCallback(e);
    throw e;
  }
  return json;
}
/*
 * return application settings in JSON
 */
export async function getSettings(callback, noCache){
  callback = callback || function () {};
  const today = new Date();
  const settingStorageKey = "FEMR_APP_SETTINGS_"+today.getFullYear()+pad(today.getMonth())+pad(today.getDate())+pad(today.getMinutes());
  if (!noCache && sessionStorage.getItem(settingStorageKey)) {
    let cachedSetting = JSON.parse(sessionStorage.getItem(settingStorageKey));
    callback(cachedSetting);
    return cachedSetting;
  }
  const response = await fetch("./settings").catch(e => {
    callback({error: e});
  });
  let data = null;
  try {
    data = await response.json();
  } catch(e) {
    callback({error: e});
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
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

export function isString (obj) {
  return (Object.prototype.toString.call(obj) === "[object String]");
}

export function pad (val, len) {
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
  let dateObj = (utcDateString instanceof Date) ? utcDateString : new Date(utcDateString);
  let year = dateObj.getFullYear();
  let month = pad(dateObj.getMonth()+1);
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
export function addYearsToDate(dt,n) {
  if (!(dt instanceof Date)) {
    let arrDates = getShortDateFromISODateString(dt).split("-");
    dt = new Date(arrDates[0], arrDates[1]-1, arrDates[2]);
  }
  dt.setFullYear(dt.getFullYear() + n);
  return dt;
}

/*
 * check if two dates are within specified number of months
 */
export function isInMonthPeriod(dateFrom, dateTo, numOfMonths) {
  let months = differenceInMonths(dateTo, dateFrom);
  return  months >= 0 && months <= numOfMonths;
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
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
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

export  async function validateToken() {
  const response = await fetch("./validate_token");
  if (!response.ok) {
    if (parseInt(response.status) === 401) {
      //redirect to home
      handleExpiredSession();
      throw "Unauthorized access";
    }
    throw response.statusText;
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

export function handleExpiredSession() {
  sessionStorage.clear();
  setTimeout(() => {
    // /home is a protected endpoint, the backend will request a new Access Token from Keycloak if able, else prompt a user to log in again
    window.location = "/home";
  }, 0);
}

