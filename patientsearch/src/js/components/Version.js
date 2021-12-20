import React from 'react';
import { makeStyles} from '@material-ui/core/styles';
import {getSettings} from './Utility';
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        textAlign: "right",
        margin: theme.spacing(2, 3, 2),
        color: theme.palette.muted.main,
        [theme.breakpoints.up('md')]: {
            maxWidth: "1080px",
            marginLeft: "auto",
            marginRight: "auto",
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3)
        }
    }
});

export default function Version(props) {
    const classes = useStyles();
    const [setting, setSetting] = React.useState({});
    const [version, setVersion] = React.useState("");
    const [initialized, setInitialized] = React.useState(false);
    const VERSION_STRING = "VERSION_STRING";
    const getVersionLink = () => {
        if (!version) return "";
        const arrVersion = version.split("-");
        /*
         * make sure version string doesn't contain 7 character git hash
         */
        const hasTaggedCommit = arrVersion.filter(item => {
            //contains 'g' character and 7 character git hash
            return item.toLowerCase().indexOf("g") !== -1 && item.length === 8;
        }).length === 0;
        const link = hasTaggedCommit ? `https://github.com/uwcirg/cosri-environments/releases/tag/${version}`: "";
        return (
           link ? <a href={link} target="_blank">{version}</a> : version
        );
    }
    React.useEffect(() => {
        /*
         * retrieve setting information
         */
        getSettings(data => {
            if (data.error) {
                console.log("Error retrieving data for version string ", data.error);
                return;
            }
            setSetting(data);
            setVersion(getVersionString());
            setInitialized(true);
        });
    }, [initialized]);
    function getVersionString() {
        if (!Object.keys(setting)) return "";
        return setting[VERSION_STRING];
    }
    return (
        <div className={props.className ? props.className : classes.container}>{version && <div>Version Number: {getVersionLink()}</div>}</div>
    );
}
