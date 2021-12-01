import React from 'react';
import PropTypes from 'prop-types';
import { makeStyles, styled } from '@material-ui/core/styles';
import AssignmentLateIcon from '@material-ui/icons/AssignmentLate';
import Tooltip from '@material-ui/core/Tooltip';
import {addYearsToDate, getLocalDateTimeString, getShortDateFromISODateString, isInMonthPeriod, isDateInPast} from "./Utility";

const useStyles = makeStyles({
    alertIcon: {
        fill: "#b5382f",
        position: "relative",
        top: "4px",
        left: "4px",
        fontSize: "1.2rem"
    },
    warningIcon: {
        fill: "#d58808",
        position: "relative",
        top: "4px",
        left: "4px",
        fontSize: "1.2rem"
    }
});
const BootstrapTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} arrow classes={{ popper: className }} />
  ))(({ theme }) => ({
    [`& .MuiTooltip-arrow`]: {
      color: theme.palette.secondary.main,
    },
    [`& .MuiTooltip-tooltip`]: {
      backgroundColor: theme.palette.secondary.main,
      fontSize: "12px"
    },
}));
export default function OverdueAlert(props) {

    /*
     * four months before next due date
     */
    function shouldShowSoftAlert(dt) {
        if (!dt) return false;
        let currentDate = new Date();
        let shortDate = getShortDateFromISODateString(dt);
        let arrDates = shortDate.split("-");
        let nextDueDate  = addYearsToDate(new Date(arrDates[0], arrDates[1], arrDates[2]), 1);
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
        let nextDueDate  = addYearsToDate(new Date(arrDates[0], arrDates[1], arrDates[2]), 1);
        return isInMonthPeriod(currentDate, nextDueDate, 3) || isDateInPast(nextDueDate, currentDate);
    }

    function shouldShowAlerts(dt) {
        return shouldShowSoftAlert(dt) || shouldShowHardAlert(dt);
    }

    function formatMessage(message, dt) {
        let dueDate = getLocalDateTimeString(addYearsToDate(dt, 1), true);
        return message.replace("[duedate]", dueDate);
    }
    const classes = useStyles();

    return (
        <React.Fragment>{shouldShowAlerts(props.date) &&
            <BootstrapTooltip title={formatMessage(props.message, props.date)} aria-label={formatMessage(props.message, props.date)} placement="top">
                <AssignmentLateIcon size="small" className={shouldShowHardAlert(props.date) ? classes.alertIcon : classes.warningIcon}></AssignmentLateIcon>
            </BootstrapTooltip>}
        </React.Fragment>);
};
OverdueAlert.propTypes = {
    date: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired
}
