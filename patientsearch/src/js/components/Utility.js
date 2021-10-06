export function sendRequest (url) {
    // Return a new promise.
    return new Promise(function(resolve, reject) {
      // Do the usual XHR stuff
      var req = new XMLHttpRequest();
      req.open('GET', url);

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
        reject(Error("Network Error"));
      };

      // Make the request
      req.send();
    });
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
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(queryString ? queryString : location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

export function isString (obj) {
  return (Object.prototype.toString.call(obj) === '[object String]');
}

export function pad (val, len) {
  if (!val) return "";
  val = String(val);
  len = len || 2;
  while (val.length < len) val = "0" + val;
  return val;
}

export function getLocalDateTimeString(utcDateString) {
  if (!utcDateString) return "";
  //note javascript Date object automatically convert UTC date/time to locate date/time, no need to parse and convert
  let dateObj = new Date(utcDateString);
  console.log("date? ", dateObj)
  let year = dateObj.getFullYear();
  let month = pad(dateObj.getMonth()+1);
  let day = pad(dateObj.getDate());
  let hours = pad(dateObj.getHours());
  let minutes = pad(dateObj.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
