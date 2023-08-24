import Dropdown from "../Dropdown";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function DropdownMenu() {
  let {
    anchorEl,
    getMenuItems = function () {
      return null;
    },
    handleMenuClose = function () {},
    handleMenuSelect = function () {},
  } = usePatientListContext();
  return (
    <Dropdown
      anchorEl={anchorEl}
      handleMenuClose={handleMenuClose}
      handleMenuSelect={handleMenuSelect}
      menuItems={getMenuItems()}
    ></Dropdown>
  );
}
