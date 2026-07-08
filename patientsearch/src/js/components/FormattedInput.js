import React, { forwardRef, useMemo } from "react";
import { IMaskInput } from "react-imask";
import Input from "@mui/material/Input";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import { convertLegacyArrayMask } from "../helpers/legacyMaskAdapter";

// NOTE: /[0,9]/ matches the literal
// characters '0', ',' or '9', not the digit range 0-9. That's very likely a
// pre-existing bug (probably meant /[0-9]/), unrelated to this migration.
// Flagging it here rather than silently changing behavior.
const DEFAULT_MAS = [
  /[1-2]/, /[0,9]/, /\d/, /\d/, "-", /\d/, /\d/, "-", /\d/, /\d/,
];

const TextMaskCustom = forwardRef(
  (props, forwardedRef) => {
    const { ownerState, mask, showMask, placeholder, onAccept, inputClass, ...other } = props;

    const { mask: pattern, definitions } = useMemo(
      () => convertLegacyArrayMask(mask ?? DEFAULT_MASK),
      [mask]
    );

    // guide=true <=> lazy=false (see note above)
    const lazy = placeholder ? true : showMask !== undefined ? !showMask : false;

    return (
      <IMaskInput
        {...other}
        inputRef={forwardedRef}
        mask={pattern}
        definitions={definitions}
        lazy={lazy}
        placeholderChar="\u2000"
        placeholder={placeholder}
        onAccept={onAccept}
      />
    );
  }
);
TextMaskCustom.displayName = "TextMaskCustom";


export default function FormattedInput(props) {
  // Replaces the old onChange handler. IMask fires onAccept whenever the
  // masked value changes; we build a minimal event-shaped object so
  // existing handleChange(event) callers keep working off event.target.value.
  const handleAccept = (value, _maskRef, event) => {
    if (!props.handleChange) return;
    props.handleChange({ target: { name: "formattedInput", value }, nativeEvent: event });
  };

  const handleKeyDown = (event) => {
    if (String(event.key).toLowerCase() === "enter") {
      if (!props.handleKeyDown) return;
      props.handleKeyDown(event);
    }
    return false;
  };

  if (props.readOnly) return <div>{props.defaultValue}</div>;

  return (
    <div className="mask-input-wrapper">
      <FormControl sx={props.controlStyle ? props.controlStyle : {}}>
        <Input
          value={props.value}
          defaultValue={props.defaultValue}
          onKeyDown={handleKeyDown}
          name="formattedInput"
          inputComponent={TextMaskCustom}
          inputProps={{
            value: props.value,
            mask: props.mask,
            showMask: props.showMask,
            placeholder: props.placeholder,
            inputClass: props.inputClass,
            onAccept: handleAccept,
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
