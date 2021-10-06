import React from "react";
import { render } from 'react-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/styles';
import Header from './components/Header';
import Info from './components/Info';
import theme from './context/theme';
import '../styles/app.scss';

// entry point
render(<React.Fragment>
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header />
        <Info />
    </ThemeProvider>
</React.Fragment>,
document.getElementById("content"));
