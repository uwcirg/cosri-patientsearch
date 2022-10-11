import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import AssignmentLateIcon from "@material-ui/icons/AssignmentLate";
import Typography from "@material-ui/core/Typography";
import theme from "../themes/theme";
import {
  addYearsToDate,
  getLocalDateTimeString,
  getShortDateFromISODateString,
  isInMonthPeriod,
  isDateInPast,
} from "../helpers/utility";

const useStyles = makeStyles({
  alertIcon: {
    fill: theme.palette.primary.alert,
    position: "relative",
    top: "4px",
    fontSize: "1.2rem",
  },
  warningIcon: {
    fill: theme.palette.primary.warning,
    position: "relative",
    top: "4px",
    fontSize: "1.2rem",
  },
  alertText: {
    color: theme.palette.primary.alert,
    display: "inline-block",
    marginLeft: "6px",
  },
  warningText: {
    color: theme.palette.primary.warning,
    display: "inline-block",
    marginLeft: "6px",
  },
});

export default function OverdueAlert(props) {
  /*
   * 3 or 4 months before next due date
   */
  function shouldShowSoftAlert(dt) {
    if (!dt) return false;
    let currentDate = new Date();
    let shortDate = getShortDateFromISODateString(dt);
    let arrDates = shortDate.split("-");
    let nextDueDate = addYearsToDate(
      new Date(arrDates[0], arrDates[1] - 1, arrDates[2]),
      1
    );
    return (
      isInMonthPeriod(currentDate, nextDueDate, 4) ||
      isInMonthPeriod(currentDate, nextDueDate, 3)
    );
  }

  /*
   * overdue
   */
  function shouldShowHardAlert(dt) {
    if (!dt) return true;
    let currentDate = new Date();
    let shortDate = getShortDateFromISODateString(dt);
    let arrDates = shortDate.split("-");
    let nextDueDate = addYearsToDate(
      new Date(arrDates[0], arrDates[1] - 1, arrDates[2]),
      1
    );
    return isDateInPast(nextDueDate, currentDate);
  }

  function isOverdue(dt) {
    if (!dt) return false;
    let currentDate = new Date();
    let shortDate = getShortDateFromISODateString(dt);
    let arrDates = shortDate.split("-");
    let nextDueDate = addYearsToDate(
      new Date(arrDates[0], arrDates[1] - 1, arrDates[2]),
      1
    );
    return isDateInPast(nextDueDate, currentDate);
  }

  function shouldShowAlerts(dt) {
    return shouldShowSoftAlert(dt) || shouldShowHardAlert(dt);
  }

  function formatMessage(message, dt) {
    if (!dt) return message;
    let dueDate = getLocalDateTimeString(addYearsToDate(dt, 1), true);
    return message.replace("[duedate]", dueDate);
  }
  function getIconClass(dt) {
    return shouldShowHardAlert(dt) ? classes.alertIcon : classes.warningIcon;
  }
  function getMessageClass(dt) {
    return shouldShowHardAlert(dt) ? classes.alertText : classes.warningText;
  }
  const getMessage = () => {
    if (!props.date) return `No ${props.type} found for this patient.`;
    if (isOverdue(props.date)) {
      if (props.overdueMessage) return props.overdueMessage;
      return `It has been more than 12 months since the last ${props.type} with this patient. ([duedate])`;
    }
    if (props.message) return props.message;
    return `A ${props.type} is due for this patient on or before [duedate].`;
  };
  const classes = useStyles();

  return (
    <React.Fragment>
      {shouldShowAlerts(props.date) && (
        <div>
          <AssignmentLateIcon
            size="small"
            className={getIconClass(props.date)}
          ></AssignmentLateIcon>
          <Typography variant="body2" className={getMessageClass(props.date)}>
            {formatMessage(getMessage(), props.date)}
          </Typography>
        </div>
      )}
    </React.Fragment>
  );
}
OverdueAlert.propTypes = {
  date: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  message: PropTypes.string,
  overdueMessage: PropTypes.string,
};
