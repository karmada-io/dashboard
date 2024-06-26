module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        // https://stackoverflow.com/questions/58510287/parseroptions-project-has-been-set-for-typescript-eslint-parser
        // this setting is required to use rules that require type information
        project: true,
    },
    plugins: [
        "@typescript-eslint"
    ],
    extends: [
        "@karmada/eslint-config-ts-react"
    ],
    rules: {
        "@typescript-eslint/no-misused-promises": "off"
    }
}