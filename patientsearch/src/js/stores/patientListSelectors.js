import { useShallow } from "zustand/react/shallow";
import { usePatientListStore } from "./patientListStore";

export const usePatientListError = () =>
  usePatientListStore((s) => s.errorMessage);

export const usePatientListLoading = () =>
  usePatientListStore((s) => s.openLoadingModal);

export const useCurrentRow = () => usePatientListStore((s) => s.currentRow);

export const usePagination = () => usePatientListStore((s) => s.pagination);
 
export const usePatientData = () => usePatientListStore((s) => s.data);

export const useActionLabel = () => usePatientListStore((s) => s.actionLabel);

export const useNoDataText = () => usePatientListStore((s) => s.noDataText);

export const useCurrentFilters = () =>
  usePatientListStore((s) => s.currentFilters);

export const useOpenReactivatingModal = () =>
  usePatientListStore((s) => s.openReactivatingModal);

export const useContainNoPMPRow = () =>
  usePatientListStore((s) => s.containNoPMPRow);

export const useFilterByTestPatients = () =>
  usePatientListStore((s) => s.filterByTestPatients);

export const usePatientIdsByCareTeamParticipant = () =>
  usePatientListStore((s) => s.patientIdsByCareTeamParticipant);

export const useLaunchURL = () => usePatientListStore((s) => s.launchURL);

export const useLaunchDialogState = () => usePatientListStore((s) => s.openLaunchInfoModal);

// Object selectors  must use useShallow to avoid infinite loop
// useShallow does a one-level shallow equality check so the reference only
// changes when one of the selected values actually changes.

export const useMenuState = () =>
  usePatientListStore(
    useShallow((s) => ({
      openMenu: s.openMenu,
      selectedMenuItem: s.selectedMenuItem,
      currentRow: s.currentRow,
    })),
  );
