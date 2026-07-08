// Converts a text-mask style array (RegExp | string) into an IMask-compatible
// { mask: pattern, definitions } pair. Supports the subset of text-mask used
// in this codebase (RegExp validators + string literals). Does NOT support
// text-mask's function-mask / conformToMask features

const DIGIT_REGEX_SOURCE = /^\[0-9\]$|^\\d$/;

function isDefaultDigit(regex) {
  return DIGIT_REGEX_SOURCE.test(regex.source);
}

const RESERVED = new Set(["0", "a", "*"]); // IMask's built-in definitions
const CANDIDATES = "YMDHNSABCEFGIJKLPQRTUVWXZ".split("");

export function convertLegacyArrayMask(maskArray) {
  let pattern = "";
  const definitions = {};
  const used = new Set(RESERVED);
  const literals = new Set(maskArray.filter((i) => typeof i === "string"));
  let i = 0;

  for (const item of maskArray) {
    if (typeof item === "string") {
      pattern += item;
      continue;
    }
    if (isDefaultDigit(item)) {
      pattern += "0";
      continue;
    }
    let char = Object.keys(definitions).find(
      (c) => definitions[c].source === item.source,
    );
    if (!char) {
      while (
        i < CANDIDATES.length &&
        (used.has(CANDIDATES[i]) || literals.has(CANDIDATES[i]))
      )
        i++;
      if (i >= CANDIDATES.length)
        throw new Error("convertLegacyArrayMask: out of definition chars");
      char = CANDIDATES[i];
      definitions[char] = item;
      used.add(char);
      i++;
    }
    pattern += char;
  }

  return { mask: pattern, definitions };
}
