import React from 'react';
import { makeStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography';
import {imageOK, sendRequest} from './Utility';
import theme from '../context/theme';

const useStyles = makeStyles({
    loader: {
        marginTop: theme.spacing(24),
        textAlign: "center"
    },
    container: {
        textAlign: "center",
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(2),
        marginTop: theme.spacing(21),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100",
        flex: "1 0 auto",
        paddingBottom: theme.spacing(4)
    },
    button: {
        width: "280px",
        borderWidth: "2px",
        marginTop: theme.spacing(3),
        fontWeight: 500
    },
    introText: {
        marginBottom: theme.spacing(2.5),
        textAlign: "center",
        fontSize: "1.8rem",
        textTransform: "capitalize",
        fontWeight: 500
    },
    bodyText: {
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
    const [loading, setLoading] = React.useState(true);
    const [setting, setSetting] = React.useState({});
    const [siteID, setSiteID] = React.useState("");
    const [initialized, setInitialized] = React.useState(false);
    const SYSTEM_TYPE_STRING = "SYSTEM_TYPE";
    const SITE_ID_STRING = "SITE_ID";

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
            setLoading(false);
        }, error => {
            console.log("Failed to retrieve data", error.statusText);
            setInitialized(true);
            setLoading(false);
        });
    }, [initialized]);
    /*
     * return site specific intro HTML text for the site, e.g. HTML block 1
     */
    function getSiteLandingIntroText() {
        if (!Object.keys(setting)) return "";
        return setting["LANDING_INTRO"];
    }
     /*
     * return site specific button text for the site
     */
     function getSiteLandingButtonText() {
        if (!Object.keys(setting)) return "";
        return setting["LANDING_BUTTON_TEXT"];
    }
    /*
     * return site specific body HTML text for the site, e.g. HTML block 2
     */
    function getSiteLandingBodyText() {
        if (!Object.keys(setting)) return "";
        return setting["LANDING_BODY"];
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
    function getIntroText() {
        const siteIntroText = getSiteLandingIntroText();
        if (siteIntroText) return siteIntroText;
        return `${getSystemType()} System`;
    }
    function getButtonText() {
        const siteButtonText = getSiteLandingButtonText();
        if (siteButtonText) return siteButtonText;
        return "Click here to log in";
    }
    function getBodyText() {
        //configurable display HTML body text for a specific site, IF available, will use it.
        if (getSiteLandingBodyText()) return getSiteLandingBodyText();
        //defaults
        if (!siteID) return `This is a ${getSystemType()} system.  Not for clinical use.`;
        if (siteID === "demo") {
            return "<p>To login, use the following</p><p><b>username</b>: \"test\" <b>password</b>: \"test\"</p><p>This demo system mimics access to the state PDMP, using the state Health Information Exchange.  Individual patient data are entirely test data, designed to show features of COSRI, and any similarity to the information of any real patient is strictly coincidenal.</p>";
        }
        return "This system is only for use by clinical staff.";
    }
    return (
        <div>
            {loading && <div className={classes.loader}><CircularProgress  size={56} color="primary"></CircularProgress></div>}
            {!loading && <div className={classes.container}>
                {/* intro text, e.g. HTML block 1 */}
                <div className={classes.introText}>
                    <div dangerouslySetInnerHTML={{ __html: getIntroText()}}></div>
                </div>
                {/* logo image */}
                {siteID && <img src={"/static/"+siteID+"/img/logo.png"} onLoad={handleImageLoaded} onError={handleImageLoadError}></img>}
                {/* button */}
                <Button color="primary" href="/home" align="center" variant="outlined" size="large" className={classes.button}>{getButtonText()}</Button>
                {/* body text, e.g. HTML block 2 */}
                <div className={classes.bodyText}>
                    <Typography component="h4" variant="h5" color="inherit" align="center" className={classes.title}>
                        <div dangerouslySetInnerHTML={{ __html: getBodyText()}}></div>
                    </Typography>
                </div>
            </div>}
        </div>
    );
}
