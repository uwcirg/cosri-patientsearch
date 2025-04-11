import PropTypes from "prop-types";
import Dropdown from "../Dropdown";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function DropdownMenu(props) {
  let { childrenProps = {} } = usePatientListContext();
  if (!props.anchorEl) return null;
  const {
    menuItems,
    handleMenuClose = function () {},
    handleMenuSelect = function () {},
    currentRowId,
    open,
  } = childrenProps["menu"] ?? {};
  return (
    <Dropdown
      anchorEl={props.anchorEl}
      open={open && props.data.id === currentRowId && !!props.anchorEl}
      handleMenuClose={handleMenuClose}
      handleMenuSelect={handleMenuSelect}
      menuItems={menuItems}
      {...props}
    ></Dropdown>
  );
}

DropdownMenu.propTypes = {
  data: PropTypes.object,
  anchorEl: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
};
