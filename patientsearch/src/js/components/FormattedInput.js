import React from "react";
import PropTypes from "prop-types";
import MaskedInput from "react-text-mask";
import { makeStyles } from "@material-ui/core/styles";
import Input from "@material-ui/core/Input";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";

const useStyles = makeStyles((theme) => ({
    root: {
      display: "inline-block",
      "& > *": {
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1)
      },
    },
}));
function TextMaskCustom(props) {
    const { inputRef, ...other } = props;
    return (
      <MaskedInput
        {...other}
        ref={(ref) => {
          inputRef(ref ? ref.inputElement : null);
        }}
        keepCharPositions={true}
        mask={props.mask ? props.mask : [/[1-2]/, /[0,9]/, /\d/, /\d/, "-", /\d/, /\d/, "-", /\d/, /\d/]}
        placeholderChar={"\u2000"}
        showMask
      />
    );
}
TextMaskCustom.propTypes = {
    inputRef: PropTypes.func.isRequired,
    mask: PropTypes.array
};
// text input field with mask
export default function FormattedInput(props) {
    const classes = useStyles();

    const handleChange = (event) => {
      if (!props.handleChange) return;
      props.handleChange(event);
    };

    const handleKeyDown = (event) => {
      if (String(event.key).toLowerCase() === "enter") {
        if (!props.handleKeyDown) return;
        props.handleKeyDown(event);
      }
      return false;
    };

    return (
      <div className={classes.root}>
        <FormControl>
          <Input
            value={props.value}
            defaultValue={props.defaultValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            name="formattedInput"
            inputComponent={TextMaskCustom}
            error={props.error}
            autoFocus={!props.disableFocus}
            classes={props.inputClass}
          />
          <FormHelperText>{props.helperText}</FormHelperText>
        </FormControl>
      </div>
    );
}
FormattedInput.propTypes = {
    value: PropTypes.string,
    defaultValue: PropTypes.string,
    error: PropTypes.bool,
    disableFocus: PropTypes.bool,
    handleChange: PropTypes.func,
    handleKeyDown: PropTypes.func,
    helperText: PropTypes.string,
    mask: PropTypes.array,
    inputClass: PropTypes.object
};
