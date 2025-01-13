import Dropdown from "../Dropdown";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function DropdownMenu(props) {
  let {
    menuProps = {},
  } = usePatientListContext();
  if (!props.anchorEl) return null;
  const {menuItems, handleMenuClose, handleMenuSelect} = menuProps;
  return (
    <Dropdown
      anchorEl={props.anchorEl}
      open={
        menuProps.open &&
        props.data.id === menuProps.currentRowId &&
        props.anchorEl
      }
      handleMenuClose={handleMenuClose}
      handleMenuSelect={handleMenuSelect}
      menuItems={menuItems}
      {...props}
    ></Dropdown>
  );
}
