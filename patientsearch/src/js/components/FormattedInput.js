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
        mask={props.mask ? props.mask : [/[1-2]/, /\d/, /\d/, /\d/, "-", /\d/, /\d/, "-", /\d/, /\d/]}
        placeholderChar={"\u2000"}
        showMask
      />
    );
}
TextMaskCustom.propTypes = {
    inputRef: PropTypes.func.isRequired,
};
export default function FormattedInput(props) {
    const classes = useStyles();

    const handleChange = (event) => {
      if (!props.handleChange) return;
      props.handleChange(event);
    };

    return (
      <div className={classes.root}>
        <FormControl>
          <Input
            value={props.value}
            onChange={handleChange}
            name="formattedInput"
            inputComponent={TextMaskCustom}
            error={props.error}
            autoFocus={!props.disableFocus}
          />
          <FormHelperText>{props.helperText}</FormHelperText>
        </FormControl>
      </div>
    );
}
FormattedInput.propTypes = {
    value: PropTypes.string,
    mask: PropTypes.array,
    error: PropTypes.bool,
    disableFocus: PropTypes.bool,
    handleChange: PropTypes.func,
    helperText: PropTypes.string
};
