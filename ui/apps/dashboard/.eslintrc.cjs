/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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