import React from 'react';
import { makeStyles} from '@material-ui/core/styles';
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        textAlign: "right",
        margin: theme.spacing(2, 3, 2),
        color: theme.palette.muted.main,
        [theme.breakpoints.up('md')]: {
            maxWidth: "960px",
            marginLeft: "auto",
            marginRight: "auto",
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3)
        }
    }
});

export default function Version() {
    const classes = useStyles();
    const [setting, setSetting] = React.useState({});
    const [version, setVersion] = React.useState("");
    const [initialized, setInitialized] = React.useState(false);
    const VERSION_STRING = "VERSION_STRING";
    React.useEffect(() => {
        /*
         * retrieve setting information
         */
        fetch("./settings")
        .then(response => response.json())
        .then((data) => {
            setSetting(data);
            setVersion(getVersionString());
            setInitialized(true);
        }).catch(e => {
            console.log(e);
        })
    }, [initialized]);
    function getVersionString() {
        if (!Object.keys(setting)) return "";
        return setting[VERSION_STRING];
    }
    return (
        <div className={classes.container}>{version && <div className="version-container">Version Number: {version}</div>}</div>
    );
}
