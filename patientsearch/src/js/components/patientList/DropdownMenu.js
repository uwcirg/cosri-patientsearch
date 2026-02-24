import { memo } from "react";
import PropTypes from "prop-types";
import Dropdown from "../Dropdown";
import { usePatientListContext } from "../../context/PatientListContextProvider";

const MenuDropdown = memo(function MenuDropdown(props) {
  return <Dropdown {...props}></Dropdown>;
});

const noop = () => {};

export default function DropdownMenu(props) {
  let { childrenProps = {} } = usePatientListContext();
  if (!props.anchorEl) return null;
  const {
    menuItems,
    handleMenuClose = noop,
    handleMenuSelect = noop,
    shouldHideMoreMenu = noop,
    currentRowId,
    open,
  } = childrenProps["menu"] ?? {};

  if (shouldHideMoreMenu()) return null;

  return (
    <MenuDropdown
      anchorEl={props.anchorEl}
      open={open && props.data.id === currentRowId && !!props.anchorEl}
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
