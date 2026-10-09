import React from "react";
import { dateTimeCompare, fetchData, sendRequest } from "../helpers/utility";

export const SUBMISSION_ERROR_MESSAGE =
  "Data submission failed. Unable to process your request.";
export const LOAD_ERROR_MESSAGE = "Could not load history.";

const initialState = {
  rows: [],
  meta: {},
  initialized: false, // first load finished (success or failure)
  loading: false, // a history fetch is in flight
  saving: null, // null | "add" | "update" | any mode string passed to save()
  snackOpen: false,
  expanded: false,
  error: "",
};

/**
 * Every "start" action has exactly one matching
 * end action that clears its flag, on success *and* failure.
 */
function reducer(state, action) {
  switch (action.type) {
    case "fetch/start":
      return { ...state, loading: true };
    case "fetch/success":
      return {
        ...state,
        loading: false,
        initialized: true,
        rows: action.rows,
        meta: action.meta,
      };
    case "fetch/failure":
      return {
        ...state,
        loading: false,
        initialized: true,
        error: action.error,
      };
    case "save/start":
      return { ...state, saving: action.mode, snackOpen: false, error: "" };
    case "save/success":
      // Per review: collapse the history table after add/update in both panels.
      return { ...state, saving: null, snackOpen: true, expanded: false };
    case "save/failure":
      return { ...state, saving: null, snackOpen: false, error: action.error };
    case "snack/close":
      return { ...state, snackOpen: false };
    case "expand/toggle":
      return { ...state, expanded: !state.expanded };
    case "error/set":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

/**
 * Loads, sorts and saves one patient's FHIR records of a single type, and owns
 * the loading/saving/snackbar/expanded/error state of a history panel.
 *
 * @param {object}   options
 * @param {string}   options.resourceType  e.g. "DocumentReference"
 * @param {string}   options.patientId
 * @param {string}   [options.searchParams] extra query string, e.g. "_sort=-date"
 * @param {function} [options.filterEntry]  (bundleEntry) => boolean
 * @param {function} options.getDate        (resource) => date used for sorting
 * @param {function} options.toRow          (resource, index) => row object
 * @param {function} [options.deriveMeta]   (sortedEntries) => object, exposed as `meta`
 * @param {number}   [options.refreshDelay] ms to wait after a save before re-fetching
 * @param {*}        [options.refreshKey]   re-fetch when this changes (e.g. config loaded)
 *
 * filterEntry / toRow / getDate / deriveMeta are read through a ref, so callers
 * can pass inline functions without triggering re-fetch loops. Anything those
 * functions depend on that should trigger a re-fetch goes in refreshKey.
 */
export default function useFhirRecordHistory(options) {
  const { resourceType, patientId, refreshKey } = options;
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const optionsRef = React.useRef(options);
  React.useLayoutEffect(() => {
    optionsRef.current = options;
  });

  // Ignores responses from superseded requests (patient switched, or a newer
  // refresh started). 
  const requestIdRef = React.useRef(0);
  // Synchronous re-entrancy guard for save (state updates are async, so a
  // double-click could otherwise fire two POSTs before `saving` re-renders).
  const savingRef = React.useRef(false);

  const refresh = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!patientId) {
      dispatch({ type: "fetch/success", rows: [], meta: {} });
      return;
    }
    dispatch({ type: "fetch/start" });
    try {
      const { searchParams } = optionsRef.current;
      const response = await sendRequest(
        `/fhir/${resourceType}?patient=${patientId}${searchParams ? `&${searchParams}` : ""}`,
        { nocache: true },
      );
      if (requestId !== requestIdRef.current) return;
      const data =
        typeof response === "string" ? JSON.parse(response) : response;

      const { filterEntry, getDate, toRow, deriveMeta } = optionsRef.current;
      const entries = (data?.entry || [])
        .filter(
          (entry) => entry?.resource && (!filterEntry || filterEntry(entry)),
        )
        .sort((a, b) =>
          dateTimeCompare(getDate(a.resource), getDate(b.resource)),
        );
      const rows = entries.map((entry, index) => toRow(entry.resource, index));
      const meta = deriveMeta ? deriveMeta(entries) : {};
      dispatch({ type: "fetch/success", rows, meta });
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      console.error(`Failed to retrieve or parse ${resourceType} history`, e);
      dispatch({ type: "fetch/failure", error: LOAD_ERROR_MESSAGE });
    }
    // refreshKey is intentionally a dependency so config changes re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceType, patientId, refreshKey]);

  /**
   * POST/PUT/DELETE one resource, then re-fetch once.
   * Resolves { ok: true } or { ok: false, error }; never throws.
   */
  const save = React.useCallback(
    async ({ method = "POST", id, resource, mode = "update" }) => {
      if (savingRef.current) return { ok: false, busy: true };
      savingRef.current = true;
      dispatch({ type: "save/start", mode });
      try {
        await fetchData(`/fhir/${resourceType}${id ? `/${id}` : ""}`, {
          method,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            cache: "no-cache",
          },
          body: JSON.stringify(resource),
        });
        const delay = optionsRef.current.refreshDelay || 0;
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        await refresh();
        dispatch({ type: "save/success" });
        return { ok: true };
      } catch (e) {
        console.error(`Failed to ${method} ${resourceType}`, e);
        dispatch({ type: "save/failure", error: SUBMISSION_ERROR_MESSAGE });
        return { ok: false, error: e };
      } finally {
        savingRef.current = false;
      }
    },
    [resourceType, refresh],
  );

  const setError = React.useCallback(
    (error) => dispatch({ type: "error/set", error: error || "" }),
    [],
  );
  const closeSnack = React.useCallback(
    () => dispatch({ type: "snack/close" }),
    [],
  );
  const toggleExpanded = React.useCallback(
    () => dispatch({ type: "expand/toggle" }),
    [],
  );

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Invalidate any in-flight request on unmount.
  React.useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  return {
    ...state,
    refresh,
    save,
    setError,
    closeSnack,
    toggleExpanded,
  };
}
