import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import AssignmentLateIcon from "@material-ui/icons/AssignmentLate";
import Typography from "@material-ui/core/Typography";
import {addYearsToDate, getLocalDateTimeString, getShortDateFromISODateString, isInMonthPeriod, isDateInPast} from "./Utility";

const useStyles = makeStyles({
    alertIcon: {
        fill: "#b5382f",
        position: "relative",
        top: "4px",
        fontSize: "1.2rem"
    },
    warningIcon: {
        fill: "#d58808",
        position: "relative",
        top: "4px",
        fontSize: "1.2rem"
    },
    alertText: {
        color: "#b5382f",
        display: "inline-block",
        marginLeft: "6px"
    },
    warningText: {
        color: "#d58808",
        display: "inline-block",
        marginLeft: "6px"
    }
});

export default function OverdueAlert(props) {

    /*
     * four months before next due date
     */
    function shouldShowSoftAlert(dt) {
        if (!dt) return false;
        let currentDate = new Date();
        let shortDate = getShortDateFromISODateString(dt);
        let arrDates = shortDate.split("-");
        let nextDueDate  = addYearsToDate(new Date(arrDates[0], arrDates[1]-1, arrDates[2]), 1);
        return isInMonthPeriod(currentDate, nextDueDate, 4);
    }

    /*
     * 3 months before next due date
     */
    function shouldShowHardAlert(dt) {
        if (!dt) return false;
        let currentDate = new Date();
        let shortDate = getShortDateFromISODateString(dt);
        let arrDates = shortDate.split("-");
        let nextDueDate  = addYearsToDate(new Date(arrDates[0], arrDates[1]-1, arrDates[2]), 1);
        return isInMonthPeriod(currentDate, nextDueDate, 3) || isDateInPast(nextDueDate, currentDate);
    }

    function shouldShowAlerts(dt) {
        return shouldShowSoftAlert(dt) || shouldShowHardAlert(dt);
    }

    function formatMessage(message, dt) {
        let dueDate = getLocalDateTimeString(addYearsToDate(dt, 1), true);
        return message.replace("[duedate]", dueDate);
    }
    function getIconClass(dt) {
        return shouldShowHardAlert(dt) ? classes.alertIcon : classes.warningIcon;
    }
    function getMessageClass(dt) {
        return shouldShowHardAlert(dt) ? classes.alertText : classes.warningText;
    }
    const classes = useStyles();

    return (
        <React.Fragment>{shouldShowAlerts(props.date) &&
                <div>
                    <AssignmentLateIcon size="small" className={getIconClass(props.date)}></AssignmentLateIcon>
                    <Typography variant="body2" className={getMessageClass(props.date)}>{formatMessage(props.message, props.date)}</Typography>
                </div>}
        </React.Fragment>);
};
OverdueAlert.propTypes = {
    date: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired
}
