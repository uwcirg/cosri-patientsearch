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
 * example input: 2021-09-14T17:52:28.365+00:00 output: 2021-09-14 17:52:28 */
export function isoDateFormat(input) {
  if (!input) return "";
  return input.substring(0, input.indexOf(".")).replace("T", " ");
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

export function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
