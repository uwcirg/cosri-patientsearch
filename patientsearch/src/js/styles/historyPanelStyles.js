/**
 * Styles shared by the record-history panels (Agreement, UrineScreen, ...).
 * Only values that were identical across the panels live here; each panel
 * spreads this and adds its own panel-specific styles.
 */
export const getHistoryPanelStyles = (theme) => ({
  container: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  contentContainer: {
    position: "relative",
  },
  addButton: {
    marginRight: theme.spacing(1),
  },
  editInput: {
    width: theme.spacing(10),
  },
});
