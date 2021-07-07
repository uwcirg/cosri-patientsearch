import { createMuiTheme } from '@material-ui/core/styles';
import cyan from '@material-ui/core/colors/cyan';
import teal from '@material-ui/core/colors/teal';

const theme = createMuiTheme({
  palette: {
    primary: {
        lightest: teal[50],
        lighter: teal[100],
        light: teal[200],
        medium: cyan[600],
        main: cyan[800],
        dark: cyan[900],
        disabled: "#e6e9e6"
    },
    secondary: {
      main: "#3c3535",
      light: "#524949"
    },
    muted: {
      main: "#777",
      light: "#ececec"
    },
    table: {
        heading: {
            background: cyan[700],
            color: "#fff"
        }
    },
  },
  overrides: {
    MuiTableSortLabel: {
      icon: {
        color: cyan[600]
      },
      active: {
        color: cyan[600]
      },
    },
  },
});

export default theme;
