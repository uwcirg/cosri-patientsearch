import Dropdown from "../Dropdown";
import { usePatientListContext } from "../../context/PatientListContextProvider";

export default function DropdownMenu() {
  let {
    anchorEl,
    menuItems,
    handleMenuClose,
    handleMenuSelect,
    shouldHideMoreMenu,
    shouldShowMenuItem,
  } = usePatientListContext();
  if (!shouldHideMoreMenu)
    shouldHideMoreMenu = function () {
      return true;
    };
  if (shouldHideMoreMenu()) return false;
  return (
    <Dropdown
      anchorEl={anchorEl}
      handleMenuClose={handleMenuClose ? handleMenuClose : function () {}}
      handleMenuSelect={handleMenuSelect ? handleMenuSelect : function () {}}
      menuItems={
        menuItems && menuItems.length
          ? menuItems.filter((item) => shouldShowMenuItem(item.id))
          : []
      }
    ></Dropdown>
  );
}
