import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";

export const usePatientListStore = create(
  subscribeWithSelector(
    immer((set) => ({
      data: [],
      patientIdsByCareTeamParticipant: null,
      launchURL: "",
      openLoadingModal: false,
      openMenu: false,
      openReactivatingModal: false,
      openLaunchInfoModal: false,
      containNoPMPRow: false,
      selectedMenuItem: "",
      currentRow: null,
      currentFilters: {},
      filterByTestPatients: false,
      errorMessage: "",
      actionLabel: "View",
      noDataText: "No record found.",
      pagination: {
        pageNumber: 0,
        prevPageNumber: 0,
        disablePrevButton: true,
        disableNextButton: true,
        totalCount: 0,
        nextPageURL: "",
        prevPageURL: "",
        pageSize: 20,
      },

      // pagination actions
      resetPagination: () =>
        set((state) => {
          state.pagination.pageNumber = 0;
          state.pagination.nextPageURL = "";
          state.pagination.prevPageURL = "";
        }),

      emptyPagination: () =>
        set((state) => {
          state.pagination.pageNumber = 0;
          state.pagination.prevPageNumber = 0;
          state.pagination.disablePrevButton = true;
          state.pagination.disableNextButton = true;
          state.pagination.totalCount = 0;
          state.pagination.nextPageURL = "";
          state.pagination.prevPageURL = "";
        }),

      updatePagination: (payload) =>
        set((state) => {
          Object.assign(state.pagination, payload);
        }),

      setLoading: (row) =>
        set((state) => {
          state.openLoadingModal = true;
          if (row) state.currentRow = row;
        }),

      setData: (data) =>
        set((state) => {
          state.data = data;
          state.openLoadingModal = false;
        }),

      setError: (payload) =>
        set((state) => {
          state.errorMessage =
            typeof payload === "string"
              ? payload
              : (payload?.errorMessage ?? "An error occurred.");
          state.openLoadingModal = false;
        }),

      setLaunchURL: (url) =>
        set((state) => {
          state.launchURL = url;
          state.currentRow = null;
          state.openLoadingModal = true;
        }),

      resetLaunchURL: () =>
        set((state) => {
          state.launchURL = "";
          state.openLoadingModal = false;
          state.currentRow = null;
        }),

      setCurrentRow: (row) => set({ currentRow: row }),

      setSelectedMenuItem: (item) => set({ selectedMenuItem: item }),

      updateFilters: (item) =>
        set({
          currentFilters: item,
        }),

      setNoDataText: (text) => set({ noDataText: text }),

      setOpenMenu: (row) => set({ currentRow: row, openMenu: true }),

      closeMenu: () => set({ openMenu: false, currentRow: null }),

      setOpenLaunchInfoModal: (row) =>
        set({ openLaunchInfoModal: true, currentRow: row }),

      closeLaunchInfoModal: () =>
        set({ openLaunchInfoModal: false, currentRow: null }),

      setOpenReactivatingModal: (row) =>
        set({ openReactivatingModal: true, currentRow: row }),

      closeReactivatingModal: () =>
        set({ openReactivatingModal: false, currentRow: null }),

      closeLoadingModal: () => set({ openLoadingModal: false }),

      setCareTeamPatientIds: (ids) =>
        set({ patientIdsByCareTeamParticipant: ids }),

      setContainNoPMPFlag: (val) => set({ containNoPMPRow: val }),

      setActionLabel: (label) => set({ actionLabel: label }),

      toggleTestPatients: (val) => set({ filterByTestPatients: val }),

      resetSearch: (payload = {}) =>
        set((state) => {
          state.currentRow = null;
          state.errorMessage = "";
          state.currentFilters = {};
          Object.assign(state, payload);
        }),

      resetState: (payload = {}) =>
        set((state) => {
          state.currentRow = null;
          state.errorMessage = "";
          Object.assign(state, payload);
        }),
    })),
  ),
);
