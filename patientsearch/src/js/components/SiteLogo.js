import React from 'react';
import { makeStyles} from '@material-ui/core/styles';
import {imageOK, sendRequest} from './Utility';
import theme from '../context/theme';

const useStyles = makeStyles({
    container: {
        textAlign: "center",
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(2)
    }
});

export default function SiteLogo() {
    const classes = useStyles();
    const [setting, setSetting] = React.useState({});
    const [siteID, setSiteID] = React.useState("");
    const [initialized, setInitialized] = React.useState(false);
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
        }, error => {
            console.log("Failed to retrieve data", error.statusText);
            setInitialized(true);
        });
    }, [initialized]);
    function getSiteId() {
        if (!Object.keys(setting)) return "";
        return setting[SITE_ID_STRING];
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

    return (
        <div className={classes.container}>{siteID && <img src={"/static/"+siteID+"/img/logo.png"} onLoad={handleImageLoaded} onError={handleImageLoadError}></img>}</div>
    );
}
