import React from 'react';
import { makeStyles} from '@material-ui/core/styles';
import {sendRequest} from './Utility';
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        textAlign: "center",
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: 9999,
        backgroundColor: theme.palette.primary.warningLight
    }
});

export default function SiteLogo() {
    const classes = useStyles();
    const [setting, setSetting] = React.useState({});
    const [systemType, setSystemType] = React.useState("");
    const [initialized, setInitialized] = React.useState(false);
    const SYSTEM_TYPE_STRING = "SYSTEM_TYPE";
    React.useEffect(() => {
        /*
         * retrieve setting information
         */
        sendRequest("./settings").then(response => {
            let data = null;
            try {
                data = JSON.parse(response);
            } catch(e) {
                console.log("error parsing data ", e);
            }
            setSetting(data);
            setSystemType(getSystemType());
            setInitialized(true);
        }, error => {
            console.log("Failed to retrieve data", error.statusText);
            setInitialized(true);
        });
    }, [initialized]);
    function getSystemType() {
        if (!Object.keys(setting)) return "";
        return setting[SYSTEM_TYPE_STRING];
    }
    function isNonProduction() {
        return systemType && String(systemType.toLowerCase()) !== "production";
    }
    return (
        /* display system type for non-production instances */
        <div className={classes.container}>{isNonProduction() && <span>{systemType} version - not for clinical use</span>}</div>
    );
}
