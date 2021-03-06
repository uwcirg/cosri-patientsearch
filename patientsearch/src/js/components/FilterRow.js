import React from 'react';
import { makeStyles} from '@material-ui/core/styles';
import DateFnsUtils from '@date-io/date-fns';
import isValid from "date-fns/isValid";
import ClearIcon from '@material-ui/icons/Clear';
import Search from '@material-ui/icons/Search';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import  {MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import theme from '../context/theme';

const useStyles = makeStyles({
    row: {
        borderBottom: "1px solid #ececec"
    },
    cell: {
        padding: theme.spacing(0, 2, 1)
    },
    toolbarCell: {
        width: "25%",
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        textAlign: "center"
    },
    button: {
        margin: theme.spacing(0.5),
        fontWeight: 500,
        textTransform: "uppercase",
        border: 0
    },
    dateInput: {
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1)
    }
});
export default function FilterRow(props) {
    const classes = useStyles();
    const LAUNCH_BUTTON_LABEL = "VIEW";
    const [firstNameFieldIndex, lastNameFieldIndex, dobFieldIndex] = [1,2,3];
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [date, setDate] = React.useState(null);
    const [dateInput, setDateInput] = React.useState("");
    const handleFirstNameChange = (event) => {
        setFirstName(event.target.value);
        props.onFilterChanged(firstNameFieldIndex, event.target.value);
    }
    const handleLastNameChange = (event) => {
        setLastName(event.target.value);
        props.onFilterChanged(lastNameFieldIndex, event.target.value);
    }
    const hasFilter = () => {
        return firstName || lastName || dateInput;
    }
    const hasCompleteFilters = () => {
        return firstName && lastName && dateInput;
    }
    const getFilterData = () => {
        if (!hasCompleteFilters()) return null;
        return {
            first_name: firstName,
            last_name: lastName,
            dob: dateInput
        };
    }
    const clearDate = () => {
        setDate(null);
        setDateInput("");
        props.onFilterChanged(dobFieldIndex, null);
    }
    const clearFields = () => {
        setFirstName("");
        setLastName("");
        props.onFilterChanged(firstNameFieldIndex, "");
        props.onFilterChanged(lastNameFieldIndex, "");
        clearDate();
    }
    const getLaunchButtonLabel = () => {
        return props.launchButtonLabel ? props.launchButtonLabel : LAUNCH_BUTTON_LABEL;
    }
    const handleKeyDown = (e) => {
        if (String(e.key).toLowerCase() === "enter") {
            props.launchFunc(e, getFilterData());
            return;
        }
        return false;
    }
    return (
            <tr className={classes.row}>
                <td className={classes.cell}>
                    {/* first name field */}
                    <TextField
                        variant="standard"
                        margin="normal"
                        id="firstName"
                        placeholder="First Name"
                        name="firstName"
                        value={firstName}
                        onChange={handleFirstNameChange}
                        onKeyDown={handleKeyDown}
                        inputProps={{"data-lpignore": true}}
                        InputProps={{
                            startAdornment: (
                            <InputAdornment position="start">
                                <Search color="primary" />
                            </InputAdornment>
                            ),
                        }}
                    />
                </td>
                <td className={classes.cell}>
                    {/* last name field */}
                    <TextField
                        variant="standard"
                        margin="normal"
                        name="lastName"
                        placeholder="Last Name"
                        id="lastName"
                        value={lastName}
                        onChange={handleLastNameChange}
                        onKeyDown={handleKeyDown}
                        inputProps={{"data-lpignore": true}}
                        InputProps={{
                            startAdornment: (
                            <InputAdornment position="start">
                                <Search color="primary"/>
                            </InputAdornment>
                            ),
                        }}
                    />
                </td>
                <td>
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                        {/* birth date field */}
                        <KeyboardDatePicker
                            autoOk={true}
                            variant="dialog"
                            openTo="year"
                            disableFuture
                            InputProps={{
                                startAdornment: (
                                <InputAdornment position="end" style={{order: 1, marginLeft: 0}}>
                                    <IconButton onClick={() => { clearDate(); }} disabled={!dateInput} style={{order: 2, padding: 0}} aria-label="Clear date" title="Clear date">
                                        <ClearIcon color={!dateInput ? "disabled" : "primary"} fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                                ),
                                className: classes.dateInput
                            }}
                            format="yyyy-MM-dd"
                            id="birthDate"
                            minDate={new Date("1900-01-01")}
                            invalidDateMessage="Date must be in YYYY-MM-DD format, e.g. 1977-01-12"
                            disableFuture
                            placeholder="YYYY-MM-DD"
                            value={date}
                            orientation="landscape"
                            onKeyDown={handleKeyDown}
                            onChange={(event, dateString) => {
                                setDateInput(dateString);
                                if (!event || !isValid(event)) {
                                    if (event && ((String(dateInput).replace(/[-_]/g, '').length) >= 8)) setDate(event);
                                    props.onFilterChanged(3, null);
                                    return;
                                }
                                setDate(event);
                                props.onFilterChanged(3, dateString);
                            }}
                            KeyboardButtonProps={{color: "primary", title: "Date picker"}}

                        />
                    </MuiPickersUtilsProvider>
                </td>
                <td className={classes.toolbarCell}>
                    {/* toolbar go button */}
                   <Button  id={props.launchButtonId} className={!hasCompleteFilters() ? `${classes.button} disabled` : classes.button} color="primary" size="small" variant="contained" onClick={(e) => props.launchFunc(e, getFilterData())}>{getLaunchButtonLabel()}</Button>
                   <Tooltip title="Clear search fields">
                       <Button variant="contained" size="small" onClick={clearFields} className={!hasFilter() ? `${classes.button} disabled` : classes.button}>Clear</Button>
                   </Tooltip>
                </td>
            </tr>

    );

};
