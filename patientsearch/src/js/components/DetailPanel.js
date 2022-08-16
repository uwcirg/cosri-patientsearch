import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import theme from "../context/theme";

const useStyles = makeStyles({
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
});

export default function DetailPanel(props) {
    const classes = useStyles();
    return (
      <div className={classes.detailPanelWrapper}>
        <Paper
          elevation={1}
          variant="outlined"
          className={classes.detailPanelContainer}
        >{props.children}</Paper>
      </div>
    );
}
