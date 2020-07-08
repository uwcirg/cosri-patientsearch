import { createMuiTheme } from '@material-ui/core/styles';
import cyan from '@material-ui/core/colors/cyan';

const theme = createMuiTheme({
  palette: {
    primary: {
        base: "#f6fafb",
        lightest: cyan[50],
        lighter: cyan[100],
        light: cyan[200],
        medium: cyan[600],        
        main: cyan[800],
        dark: cyan[900]
    },
    secondary: {
      main: "#3c3535",
      light: "#524949",
      lighter: "#a2a4a5"
    },
    table: {
        heading: {
            background: cyan[700],
            color: "#fff"
        }
    }
  }
});

export default theme;
