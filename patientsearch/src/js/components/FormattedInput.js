import React, {forwardRef} from "react";
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
      showMask
    />
  );
});
TextMaskCustom.propTypes = {
  mask: PropTypes.array,
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
          components={{Input : TextMaskCustom}}
          inputProps={{value: props.value}}
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
};
