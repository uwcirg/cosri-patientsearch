import React from "react";
import PropTypes from "prop-types";
import { makeStyles, styled } from "@material-ui/core/styles";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Button from "@material-ui/core/Button";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";
import theme from "../themes/theme";

const useStyles = makeStyles({
  menu: {
    paddingTop: theme.spacing(2.5),
  },
  menuTitle: {
    position: "absolute",
    top: 0,
    width: "100%",
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
    backgroundColor: theme.palette.primary.dark,
    color: "#FFF",
  },
  menuIcon: {
    minWidth: theme.spacing(3),
    marginRight: theme.spacing(0.5),
  },
  menuTitleText: {
    display: "inline-block",
    marginLeft: theme.spacing(2),
    fontWeight: 500,
  },
  menuCloseButton: {
    position: "absolute",
    right: "-8px",
    top: "0",
    fontSize: "12px",
    color: "#FFF",
  },
});
export default function Dropdown(props) {
  const classes = useStyles();
  const StyledMenu = styled((props) => <Menu {...props} />)(({ theme }) => ({
    "& .MuiPaper-root": {
      borderRadius: 0,
      marginTop: theme.spacing(3),
      minWidth: 180,
      "& .MuiMenu-list": {
        padding: "32px 0 8px",
      },
      "& .MuiMenuItem-root": {
        paddingBottom: theme.spacing(0.5),
        paddingLeft: theme.spacing(1.5),
        paddingRight: theme.spacing(2.5),
        width: "100%",
        "& .MuiSvgIcon-root": {
          fontSize: 16,
          marginRight: theme.spacing(0.25),
        },
      },
    },
  }));

  const handleMenuClose = (event) => {
    event.stopPropagation();
    if (props.handleMenuClose) props.handleMenuClose(event);
  };

  const handleMenuSelect = (event) => {
    event.stopPropagation();
    if (props.handleMenuSelect) props.handleMenuSelect(event);
    handleMenuClose(event);
  };

  return (
    <StyledMenu
      id="dropdownMenu"
      anchorEl={props.anchorEl}
      keepMounted
      open={Boolean(props.anchorEl)}
      onClose={(event) => handleMenuClose(event)}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
      elevation={2}
    >
      <div className={classes.menuTitle}>
        <Typography variant="subtitle2" className={classes.menuTitleText}>
          Select
        </Typography>
        <Button
          size="small"
          onClick={(event) => handleMenuClose(event)}
          className={classes.menuCloseButton}
        >
          X
        </Button>
      </div>
      {props.menuItems.map((item, index) => {
        return (
          <MenuItem
            key={`menuItem${index}`}
            onClick={(event) => handleMenuSelect(event)}
            dense
          >
            <ListItemIcon className={classes.menuIcon} datatopic={item.id}>
              <AddCircleOutlineIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="subtitle2" datatopic={item.id}>
              {item.text}
            </Typography>
          </MenuItem>
        );
      })}
    </StyledMenu>
  );
}
Dropdown.propTypes = {
  menuItems: PropTypes.array.isRequired,
  anchorEl: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  handleMenuClose: PropTypes.func,
  handleMenuSelect: PropTypes.func,
};
