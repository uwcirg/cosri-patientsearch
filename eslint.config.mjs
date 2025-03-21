import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";
import babelParser from "@babel/eslint-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends(
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
), {
    plugins: {
        react,
        "react-hooks": fixupPluginRules(reactHooks),
    },
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.jest,
        },

        parser: babelParser,
        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },
    settings: {
        react: {
            pragma: "React",
            version: "detect",
            fragment: "Fragment",
        },

        propWrapperFunctions: ["forbidExtraProps", {
            property: "freeze",
            object: "Object",
        }, {
            property: "myFavoriteWrapper",
        }, {
            property: "forbidExtraProps",
            exact: true,
        }],

        componentWrapperFunctions: ["observer", {
            property: "styled",
        }, {
            property: "observer",
            object: "Mobx",
        }, {
            property: "observer",
            object: "<pragma>",
        }],
    },

    rules: {
        semi: "error",
        "react/react-in-jsx-scope": "off",
        "react/display-name": "off",
        "no-useless-escape": "off",
        "react/jsx-uses-react": "error",
        "react/jsx-uses-vars": "error",
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
    },
}, {
    files: ["**/__tests__/**/*"],

    languageOptions: {
        globals: {
            ...globals.jest,
        },
    },
}];