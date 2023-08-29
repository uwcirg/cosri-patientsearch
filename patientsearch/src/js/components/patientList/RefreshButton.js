import { makeStyles } from "@material-ui/core/styles";
import { Button, Tooltip } from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";

const useStyles = makeStyles((theme) => ({
  refreshButtonContainer: {
    display: "inline-block",
    verticalAlign: "top",
    marginTop: theme.spacing(2.5),
    marginRight: theme.spacing(2),
  },
}));

export default function RefreshButton() {
  const classes = useStyles();
  return (
    <div className={classes.refreshButtonContainer}>
      <Tooltip title="Refresh the list">
        <Button
          variant="contained"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => {
            location.reload();
          }}
        >
          Refresh
        </Button>
      </Tooltip>
    </div>
  );
}
