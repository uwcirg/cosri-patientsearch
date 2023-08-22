import { makeStyles } from "@material-ui/core/styles";
export default makeStyles((theme) => ({
  container: {
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: theme.spacing(2),
    marginTop: 148,
  },
  filterTable: {
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(20),
    ["@media (min-width:639px)"]: {
      marginTop: 0,
    },
  },
  table: {
    minWidth: 320,
    maxWidth: "100%",
  },
  detailPanelWrapper: {
    backgroundColor: "#dde7e6",
    padding: theme.spacing(0.25),
  },
  detailPanelContainer: {
    position: "relative",
    minHeight: theme.spacing(8),
    backgroundColor: "#fbfbfb",
  },
  detailPanelCloseButton: {
    position: "absolute",
    top: theme.spacing(1.5),
    right: theme.spacing(6),
    color: theme.palette.primary.main,
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(4, 4, 4),
    border: 0,
    minWidth: "250px",
  },
  flex: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  flexButton: {
    marginRight: theme.spacing(1),
  },
  label: {
    marginRight: theme.spacing(1.5),
  },
  button: {
    background: theme.palette.primary.main,
    padding: theme.spacing(1, 2, 1),
    color: "#FFF",
    fontSize: "12px",
    borderRadius: "4px",
    fontWeight: 600,
    textTransform: "uppercase",
    border: 0,
  },
  warning: {
    color: theme.palette.primary.warning,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    lineHeight: 1.7,
  },
  legend: {
    marginTop: theme.spacing(2.5),
  },
  pagination: {
    marginTop: theme.spacing(1),
    display: "inline-block",
    border: "2px solid #ececec",
  },
  legendIcon: {
    backgroundColor: theme.palette.primary.disabled,
    width: theme.spacing(6),
    height: theme.spacing(3),
    marginRight: theme.spacing(0.5),
    display: "inline-block",
    verticalAlign: "bottom",
  },
  flexContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  refreshButtonContainer: {
    display: "inline-block",
    verticalAlign: "top",
    marginTop: theme.spacing(2.5),
    marginRight: theme.spacing(2),
  },
  spacer: {
    minWidth: "20px",
    minHeight: "20px",
  },
  moreIcon: {
    marginRight: theme.spacing(1),
  },
  tableOptionContainers: {
    marginBottom: theme.spacing(2),
  },
}));
