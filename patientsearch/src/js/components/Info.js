import React from 'react';
import { makeStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import {imageOK, sendRequest} from './Utility';
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        textAlign: "center",
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(2),
        marginTop: theme.spacing(24),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100",
        flex: "1 0 auto",
        paddingBottom: theme.spacing(4)
    },
    button: {
        width: "240px",
        borderWidth: "2px",
        marginTop: theme.spacing(3)
    },
    info: {
        marginTop: theme.spacing(3),
        maxWidth: "640px"
    },
    title: {
        fontSize: "1.25rem",
        lineHeight: "1.5"
    }
});

export default function Info() {
    const classes = useStyles();
    const [setting, setSetting] = React.useState({});
    const [siteID, setSiteID] = React.useState("");
    const [initialized, setInitialized] = React.useState(false);
    const SYSTEM_TYPE_STRING = "SYSTEM_TYPE";
    //config name for site login HTML string
    const SITE_INFO_STRING = "SITE_LOGIN_INFO";
    const SITE_ID_STRING = "SITE_ID";
    const siteNameMappings = {
        "FCK": "FamilyCare of Kent",
        "SFH": "Skagit Family Health"
    }
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
            setSiteID(getSiteId());
            setInitialized(true);
        }, error => {
            console.log("Failed to retrieve data", error.statusText);
            setInitialized(true);
        });
    }, [initialized]);
    /*
     * return info content specific for the site
     */
    function getSiteLoginInfo() {
        if (!Object.keys(setting)) return "";
        return setting[SITE_INFO_STRING];
    }
    function getSiteId() {
        if (!Object.keys(setting)) return "";
        return setting[SITE_ID_STRING];
    }
    function getSystemType() {
        if (!Object.keys(setting)) return "test";
        return setting[SYSTEM_TYPE_STRING];
    }
    function handleImageLoaded(e) {
        if (!e.target) {
          return false;
        }
        let imageLoaded = imageOK(e.target);
        if (!imageLoaded) {
          e.target.setAttribute("disabled", true);
          return;
        }
        let defaultLogoImage = document.querySelector(".default-logo");
        if (defaultLogoImage) {
          defaultLogoImage.setAttribute("disabled", true);
        }
    }
    function handleImageLoadError(e) {
        if (!e.target) {
          return false;
        }
        let imageLoaded = imageOK(e.target);
        if (!imageLoaded) {
          e.target.setAttribute("disabled", true);
          return;
        }
    }
    function getMessage() {
        //configurable display text for a specific site
        if (getSiteLoginInfo()) return getSiteLoginInfo();
        if (!siteID) return `This is a ${getSystemType()} system.  Not for clinical use.`;
        if (siteID === "demo") {
            return "Public Demonstration version of COSRI. <br/>Log in with username:test and password:test.";
        }
        let siteName = siteNameMappings[siteID];
        if (siteName) {
            return `This system is only for use by clinical staff of ${siteName}.`;
        }
        return "This system is only for use by clinical staff.";
    }
    return (
        <div className={classes.container}>
            {siteID && <img src={"/static/"+siteID+"/img/logo.png"} onLoad={handleImageLoaded} onError={handleImageLoadError}></img>}
            <Button color="primary" href="/" align="center" variant="outlined" size="large" className={classes.button}>Click here to log in</Button>
            <div className={classes.info}>
                <Typography component="h4" variant="h5" color="inherit" align="center" className={classes.title}>
                    <div dangerouslySetInnerHTML={{ __html: getMessage()}}></div>
                </Typography>
            </div>
        </div>
    );
}
