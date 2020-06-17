import React from 'react';
import {makeStyles} from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Avatar from '@material-ui/core/Avatar';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import Link from '@material-ui/core/Link';
import HowToRegIcon from '@material-ui/icons/HowToReg';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import logo from "../../assets/logo_horizontal.png";


const useStyles = makeStyles((theme) => ({
    toolbar: {
        paddingRight: 16, // keep right padding when drawer closed
    },
    topBar: {
        padding: 0,
        background: "#FFF",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between"
    },
    toolbarIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 8px',
        ...theme.mixins.toolbar,
    },
    appBar: {
            zIndex: 999,
            transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
    },
    title: {
        width: "100%"
    },
    welcomeContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginRight: theme.spacing(3)
    },
    welcomeText: {
        marginTop: theme.spacing(0.5),
        marginBottom: theme.spacing(0.5),
        fontWeight: 400,
        display: "flex",
        flexDirection: "row",
        alignItems: "center"
    },
    avatar: {
        color: theme.palette.primary.dark,
        borderColor: theme.palette.primary.dark,
        borderWidth: "1px",
        borderStyle: "solid",
        background: "transparent",
        marginRight: theme.spacing(1),
        width: "32px",
        height: "32px"
    },
    buttonContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "100%",
        marginLeft: theme.spacing(1),
        '& > *': {
            fontWeight: 400,
            marginRight: theme.spacing(0.5)
        },
    },
    linkIcon: {
        color: theme.palette.secondary.light
    }
}));

export default function Header() {
    const classes = useStyles();
    return (
        <AppBar position="absolute" className={classes.appBar}>
            <Toolbar className={classes.topBar}>
                <img src={logo} alt="Logo"/>
                <Box className={classes.welcomeContainer}>
                    <div>
                        <Typography component="h6" variant="h6" color="textPrimary" noWrap className={classes.welcomeText}>
                            <Avatar className={classes.avatar}>
                                <HowToRegIcon />
                            </Avatar>
                            Welcome
                        </Typography>
                    </div>
                    <div className={classes.buttonContainer}>
                        <Link color="secondary" variant="body1" href="/logout" >
                            Logout
                        </Link>
                        <ExitToAppIcon color="secondary" fontSize="default" className={classes.linkIcon}></ExitToAppIcon>
                    </div>
                </Box>
            </Toolbar>
            <Toolbar className={classes.toolbar} disableGutters variant="dense">
                <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title} align="center">
                    Clinical Opioid Summary with Rx Integration
                </Typography>
            </Toolbar>
        </AppBar>
    );
};
