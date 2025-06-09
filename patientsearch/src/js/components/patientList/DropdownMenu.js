import { memo } from "react";
import PropTypes from "prop-types";
import Dropdown from "../Dropdown";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function DropdownMenu(props) {
  let { childrenProps = {} } = usePatientListContext();
  if (!props.anchorEl) return null;
  const {
    anchorPosition,
    menuItems,
    handleMenuClose = function () {},
    handleMenuSelect = function () {},
    shouldHideMoreMenu = function () {},
    currentRowId,
    open,
  } = childrenProps["menu"] ?? {};

  if (shouldHideMoreMenu()) return null;

  const MenuDropdown = memo(function MenuDropdown(props) {
    return (
      <Dropdown
        {...props}
      ></Dropdown>
    );
  });
  return (
    <MenuDropdown
      anchorEl={props.anchorEl}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition}
      open={open && props.data.id === currentRowId}
      handleMenuClose={handleMenuClose}
      handleMenuSelect={handleMenuSelect}
      menuItems={menuItems}
      {...props}
    ></MenuDropdown>
  );
}

DropdownMenu.propTypes = {
  data: PropTypes.object,
  anchorEl: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
};
