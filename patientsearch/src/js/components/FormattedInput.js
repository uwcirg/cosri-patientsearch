import React, { forwardRef } from "react";
import PropTypes from "prop-types";
import MaskedInput from "react-text-mask";
import makeStyles from "@mui/styles/makeStyles";
import Input from "@mui/material/Input";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "inline-block",
    "& > *": {
      marginLeft: theme.spacing(1),
      marginRight: theme.spacing(1),
    },
  },
}));
const TextMaskCustom = forwardRef((props, setRef) => {
  /* eslint-disable no-unused-vars  */
  /* eslint-disable react/prop-types */
  const { ownerState, ...other } = props;
  return (
    <MaskedInput
      {...other}
      ref={(innerRef) => {
        if (innerRef) {
          setRef(innerRef.inputElement);
        }
      }}
      keepCharPositions={true}
      mask={
        props.mask
          ? props.mask
          : [/[1-2]/, /[0,9]/, /\d/, /\d/, "-", /\d/, /\d/, "-", /\d/, /\d/]
      }
      placeholderChar={"\u2000"}
      placeholder={props.placeholder ? props.placeholder : null}
      guide={
        props.placeholder
          ? false
          : props.showMask !== undefined
          ? props.showMask
          : true
      }
    />
  );
});
TextMaskCustom.propTypes = {
  mask: PropTypes.array,
  showMask: PropTypes.bool,
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
  if (props.readOnly)
    return <div className={classes.root}>{props.defaultValue}</div>;
  return (
    <div className={classes.root}>
      <FormControl sx={props.controlStyle ? props.controlStyle : {}}>
        <Input
          value={props.value}
          defaultValue={props.defaultValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          name="formattedInput"
          inputComponent={TextMaskCustom}
          inputProps={{
            value: props.value,
            mask: props.mask,
            showMask: props.showMask,
            placeholder: props.placeholder,
          }}
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
  inputClass: PropTypes.object,
  placeholder: PropTypes.string,
  readOnly: PropTypes.bool,
  showMask: PropTypes.bool,
  controlStyle: PropTypes.object,
};
