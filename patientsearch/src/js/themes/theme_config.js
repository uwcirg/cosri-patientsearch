import { createTheme } from "@material-ui/core/styles";
import cyan from "@material-ui/core/colors/cyan";
import teal from "@material-ui/core/colors/teal";
import deepPurple from "@material-ui/core/colors/deepPurple";

const feedbackColors = {
  disabled: "rgb(231, 238, 231)",
  success: "green",
  warning: "#a56906",
  warningLight: "rgba(250,194,25,.7)",
  alert: "#b5382f",
};

const secondaryColors = {
  main: "#3c3535",
  light: "#524949",
};

const mutedColors = {
  main: "#888",
  light: "#ececec",
};

export const themes = {
  default: createTheme({
    palette: {
      dark: {
        main: "#024144",
        secondary: cyan[900],
      },
      primary: {
        lightest: teal[50],
        lighter: teal[100],
        light: teal[200],
        medium: cyan[600],
        main: cyan[800],
        dark: cyan[900],
        ...feedbackColors,
      },
      secondary: secondaryColors,
      muted: mutedColors,
      table: {
        heading: {
          background: cyan[700],
          color: "#fff",
        },
      },
    },
    overrides: {
      MuiTableSortLabel: {
        icon: {
          color: cyan[600],
        },
        active: {
          color: cyan[600],
        },
      },
    },
  }),
  dcw: createTheme({
    palette: {
      dark: {
        main: "#024144",
        secondary: deepPurple[900],
      },
      primary: {
        lightest: deepPurple[50],
        lighter: deepPurple[100],
        light: deepPurple[200],
        medium: deepPurple[700],
        main: deepPurple[900],
        dark: deepPurple[900],
        ...feedbackColors,
      },
      secondary: secondaryColors,
      muted: mutedColors,
      table: {
        heading: {
          background: deepPurple[900],
          color: "#fff",
        },
      },
    },
    overrides: {
      MuiTableSortLabel: {
        icon: {
          color: deepPurple[700],
        },
        active: {
          color: deepPurple[700],
        },
      },
    },
  }),
  // project dependent theme here
};

export const getTheme = (projectID) => {
    return themes[String(projectID).toLowerCase()] || themes["default"];
};

