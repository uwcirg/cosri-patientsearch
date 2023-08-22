import useStyles from "../../../styles/patientListStyle";
import { Button, Tooltip } from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";

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
