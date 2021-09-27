import React from "react";
import { render } from 'react-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/styles';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Header from './components/Header';
import theme from './context/theme';
import '../styles/app.scss';

// entry point
render(<React.Fragment>
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header />
        <div className="logout-container">
            <Typography component="h4" variant="h5" color="inherit" align="center">
                You have been logged out.
            </Typography>
            <br/>
            <Button color="primary" href="/" align="center" variant="outlined" size="large">Click here to log in</Button>
        </div>
    </ThemeProvider>
</React.Fragment>,
document.getElementById("content"));
