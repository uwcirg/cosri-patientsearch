import React, { memo, useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Dropdown from "../Dropdown";
import { usePatientDataContext } from "../../context/PatientListContextProvider";
import { useSettingContext } from "../../context/AppContextProvider";
import { usePatientListStore } from "../../stores/patientListStore";
import { useMenuState, useCurrentRow } from "../../stores/patientListSelectors";
import { isEmptyArray, toggleDetailPanel } from "../../helpers/utility";
import { MORE_MENU_KEY, defaultMenuItems } from "../../constants/consts";

const MenuDropdown = memo(function MenuDropdown(props) {
  return <Dropdown {...props} />;
});

 const { setSelectedMenuItem, closeMenu, setCurrentRow } = usePatientListStore.getState();

export default function DropdownMenu(props) {
  const { getAppSettingByKey = () => null } = useSettingContext();
  const { tableRef } = usePatientDataContext();
  const { openMenu } = useMenuState();
  const currentRow = useCurrentRow();
  const currentRowId = currentRow?.id;
  const cloneTableRef = useRef(null);
  const anchorEl =
    props.anchorEl ?? document.querySelector("#actions_" + currentRow?.id);
  const shouldHideMoreMenu = useCallback(() => {
    return isEmptyArray(getAppSettingByKey(MORE_MENU_KEY));
  }, [getAppSettingByKey]);
  const shouldShowMenuItem = useCallback(
    (id) => {
      const arr = getAppSettingByKey(MORE_MENU_KEY);
      if (isEmptyArray(arr)) return false;
      return !!arr.find(
        (item) => String(item).toLowerCase() === String(id).toLowerCase(),
      );
    },
    [getAppSettingByKey],
  );
  const getMenuItems = useCallback(
    () =>
      shouldHideMoreMenu()
        ? []
        : !isEmptyArray(defaultMenuItems)
          ? defaultMenuItems.filter((i) => shouldShowMenuItem(i.id))
          : [],
    [shouldShowMenuItem, shouldHideMoreMenu],
  );
  const handleMenuSelect = useCallback(
    (event) => {
      event.stopPropagation();
      const selected = event.currentTarget?.getAttribute("datatopic");
      const row = usePatientListStore.getState().currentRow;
      if (!selected) return;
      if (!row) return;
      setSelectedMenuItem(selected);
      setTimeout(() => {
        row.tableData.showDetailPanel = true;

        toggleDetailPanel(cloneTableRef.current, row);
      }, 350);
    },
    [cloneTableRef],
  );

  useEffect(() => {
    if (!tableRef?.current) return;
    if (cloneTableRef.current) return;
    cloneTableRef.current = tableRef.current;
  }, [tableRef]);

  const handleMenuClose = useCallback(() => {
    closeMenu();
    setCurrentRow(null);
  }, []);

  const menuItems = getMenuItems();
  if (isEmptyArray(menuItems)) return null;
  if (!anchorEl) return null;
  if (!props.data?.id || props.data?.id !== currentRowId) return null;
  return (
    <MenuDropdown
      anchorEl={anchorEl}
      open={openMenu}
      handleMenuClose={handleMenuClose}
      handleMenuSelect={handleMenuSelect}
      menuItems={menuItems}
      {...props}
    />
  );
}

DropdownMenu.propTypes = {
  data: PropTypes.object,
  anchorEl: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
};
