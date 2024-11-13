import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import i18nInstance, { getLang } from '@/utils/i18n';
import { initReactI18next } from 'react-i18next';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// https://github.com/remcohaszing/monaco-yaml/issues/150
import yamlWorker from '@/utils/workaround-yaml.worker?worker';
import enTexts from '../locales/en-US.json';
import zhTexts from '../locales/zh-CN.json';
import { initRoute } from '@/routes/route.tsx';
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://11deae085432e4e68dc5dccf6d79162b@o4508215039623168.ingest.us.sentry.io/4508215089496064',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

window.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'yaml') {
      return new yamlWorker();
    }
    return new editorWorker();
  },
};
loader.config({ monaco });

i18nInstance
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    debug: true,
    lng: getLang(), // if you're using a language detector, do not define the lng option
    fallbackLng: ['zh-CN'],
    resources: {
      zh: {
        translation: zhTexts,
      },
      en: {
        translation: enTexts,
      },
    },
    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
    saveMissing: true, // send not translated keys to endpoint,
    react: {
      useSuspense: false,
    },
  })
  .then(() => {
    initRoute();
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch(() => {});
