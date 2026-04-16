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
        }),

      setError: (payload) =>
        set((state) => {
          state.errorMessage =
            typeof payload === "string"
              ? payload
              : (payload?.errorMessage ?? "An error occurred.");
        }),

      setLaunchURL: (url) =>
        set((state) => {
          state.launchURL = url;
        }),

      resetLaunchURL: () =>
        set((state) => {
          state.launchURL = "";
        }),

      setCurrentRow: (row) => set({ currentRow: row }),

      setSelectedMenuItem: (item) => set({ selectedMenuItem: item }),

      updateFilters: (item) =>
        set({
          currentFilters: item,
        }),

      setNoDataText: (text) => set({ noDataText: text }),

      setOpenMenu: () => set({ openMenu: true }),

      closeMenu: () => set({ openMenu: false }),

      setOpenLaunchInfoModal: () => set({ openLaunchInfoModal: true }),

      closeLaunchInfoModal: () => set({ openLaunchInfoModal: false }),

      setOpenReactivatingModal: () => set({ openReactivatingModal: true }),

      closeReactivatingModal: () => set({ openReactivatingModal: false }),

      closeLoadingModal: () => set({ openLoadingModal: false }),

      setCareTeamPatientIds: (ids) =>
        set({ patientIdsByCareTeamParticipant: ids }),

      setContainNoPMPFlag: (val) => set({ containNoPMPRow: val }),

      setActionLabel: (label) => set({ actionLabel: label }),

      toggleTestPatients: (val) => set({ filterByTestPatients: val }),

      resetSearch: (payload = {}) =>
        set((state) => {
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
