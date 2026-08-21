import React from "react";
import PropTypes from "prop-types";
import { useTheme, styled } from "@mui/material/styles";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";


 const StyledMenu = styled((props) => <Menu {...props} />)(({ theme }) => ({
   "& .MuiPaper-root": {
     borderRadius: 0,
     // marginTop: theme.spacing(2),
     overflow: "hidden",
     minWidth: 180,
     "& .MuiMenu-list": {
       padding: "32px 0 8px",
       overflow: "hidden",
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

export default function Dropdown(props) {
  const theme = useTheme();
  const classes = {
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
  };

  const handleMenuClose = (event) => {
    event.stopPropagation();
    if (props.handleMenuClose) props.handleMenuClose(event);
  };

  const handleMenuSelect = (event) => {
    event.stopPropagation();
    if (props.handleMenuSelect) props.handleMenuSelect(event);
    handleMenuClose(event);
  };

  const menuItems = props.menuItems ? props.menuItems : null;

  if (!menuItems) return null;
  if (!props.anchorEl) return null;

  return (
    <StyledMenu
      id="dropdownMenu"
      anchorEl={props.anchorEl}
      open={!!props.open}
      onClose={(event) => handleMenuClose(event)}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      elevation={2}
    >
      <Box sx={classes.menuTitle}>
        <Typography variant="subtitle2" sx={classes.menuTitleText}>
          Select
        </Typography>
        <Button
          size="small"
          onClick={handleMenuClose}
          sx={classes.menuCloseButton}
        >
          X
        </Button>
      </Box>
      {menuItems.map((item, index) => {
        return (
          <MenuItem
            key={`menuItem${index}`}
            onClick={handleMenuSelect}
            dense
            datatopic={item.id}
          >
            <ListItemIcon sx={classes.menuIcon} datatopic={item.id}>
              <AddCircleOutlineIcon fontSize="small"/>
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
  open: PropTypes.bool
};
