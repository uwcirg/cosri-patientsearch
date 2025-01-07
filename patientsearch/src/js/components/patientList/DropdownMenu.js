import Dropdown from "../Dropdown";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function DropdownMenu(props) {
  let {
   // anchorEl,
    currentRow,
    getMenuItems = function () {
      return null;
    },
    handleMenuClose = function () {},
    handleMenuSelect = function () {},
  } = usePatientListContext();
  if (!props.anchorEl) return null;
  return (
    (
      <Dropdown
        anchorEl={props.anchorEl}
        open={props.data.id === currentRow?.id}
        handleMenuClose={handleMenuClose}
        handleMenuSelect={handleMenuSelect}
        menuItems={getMenuItems()}
        {...props}
      ></Dropdown>
    )
  );
}
