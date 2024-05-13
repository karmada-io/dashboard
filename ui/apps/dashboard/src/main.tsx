import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import i18n from "i18next";
import detector from "i18next-browser-languagedetector";
import backend from "i18next-http-backend";
import {initReactI18next} from "react-i18next";

i18n
    .use(detector)
    .use(backend)
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        debug: true,
        backend: {
            loadPath: '/i18n/{{lng}}/{{ns}}.json',
            addPath: '/i18n/{{lng}}/{{ns}}.json',
        },
        // lng: "en", // if you're using a language detector, do not define the lng option
        fallbackLng: "zh-CN",

        interpolation: {
            escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
        },
        saveMissing: true, // send not translated keys to endpoint,
    });


ReactDOM
    .createRoot(document.getElementById('root')!)
    .render(
        <React.StrictMode>
            <App/>
        </React.StrictMode>,
    )
