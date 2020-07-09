import React from 'react';
import {makeStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';

const useStyles = makeStyles((theme) => ({
    buttonContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        marginLeft: theme.spacing(1),
        '& > *': {
            fontWeight: 400,
            marginRight: theme.spacing(0.5)
        },
    },
    logoutButton: {
        background: "#FFF",
        boxShadow: "0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 2px 0px rgba(0,0,0,0.12)"
    },
    linkIcon: {
        color: theme.palette.secondary.light,
        marginLeft: theme.spacing(0.5)
    },
    linkText: {
       marginLeft: theme.spacing(0.5)
    }
}));

export default function Logout(props) {
    const classes = useStyles();
    return (
        <div className={classes.buttonContainer}>
            <Button variant="outlined" href="/logout" size={props.size || "small"} className={classes.logoutButton}>
                <span className={classes.linkText}>Logout</span>
                <ExitToAppIcon color="secondary" fontSize="default" className={classes.linkIcon}></ExitToAppIcon>
            </Button>
        </div>
    );
};
