import { memo } from "react";
import PropTypes from "prop-types";
import makeStyles from "@mui/styles/makeStyles";
import { Button, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const useStyles = makeStyles((theme) => ({
  refreshButtonContainer: {
    display: "inline-block",
    verticalAlign: "top",
    marginTop: theme.spacing(2.5),
    marginRight: theme.spacing(2),
  },
}));

const refreshFunction = () => {
  location.reload();
};

const MemoizedRefreshButton = memo(function MemoizedRefreshButton(props) {
  return (
    <div className={props.containerClass}>
      <Tooltip title="Refresh the list">
        <Button
          variant="contained"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={refreshFunction}
        >
          Refresh
        </Button>
      </Tooltip>
    </div>
  );
});

MemoizedRefreshButton.propTypes = {
  containerClass: PropTypes.string,
};

export default function RefreshButton() {
  const classes = useStyles();
  return (
    <MemoizedRefreshButton containerClass={classes.refreshButtonContainer} />
  );
}
