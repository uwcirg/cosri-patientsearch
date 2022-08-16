import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  overlayContainer: {
    display: "table",
    width: "100%",
    height: "100%",
    background: "rgb(255 255 255 / 70%)",
  },
  overlayElement: {
    display: "table-cell",
    width: "100%",
    height: "100%",
    verticalAlign: "middle",
    textAlign: "center",
  },
});

export default function OverlayElement(props) {
    const classes = useStyles();
    return (
      <div className={classes.overlayContainer}>
        <div className={classes.overlayElement}>
            {props.children}
        </div>
      </div>
    );
}
