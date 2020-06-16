import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import logoImage from '../../assets/img/stayhome-logo.png';
export default class Header extends Component {
  render() {
      return (
        <AppBar position="absolute" className="mdc-top-app-bar">
            <Toolbar >
                <img className="header__logo-img primary" src={logoImage} alt="stayhome logo" />
                <Typography component="h1" variant="h6" color="inherit" noWrap className="mdc-top-app-bar__title">
                    Dashboard
                </Typography>
                <Button variant="contained" color="primary" href="./logout">
                    Logout
                </Button>
            </Toolbar>
        </AppBar>
      );
  }
}
