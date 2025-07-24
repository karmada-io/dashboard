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

import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { dynamicBase } from 'vite-plugin-dynamic-base';
import banner from 'vite-plugin-banner';
import { getLicense } from '@karmada/utils';

const replacePathPrefixPlugin = (): Plugin => {
  return {
    name: 'replace-path-prefix',
    transformIndexHtml: async (html) => {
      if (process.env.NODE_ENV !== 'production') {
        return html.replace('{{PathPrefix}}', '');
      }
      return html;
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const license = getLicense();

  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: process.env.NODE_ENV === 'development' ? '' : '/static',

    plugins: [
      banner(license) as Plugin,
      react(),
      svgr(),
      replacePathPrefixPlugin(),
      dynamicBase({
        publicPath: 'window.__dynamic_base__',
        transformIndexHtml: true,
      }),
    ],
    resolve: {
      alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
    },
    server: {
      proxy: {
        '^/api/v1/terminal/sockjs*': {
          target: 'ws://localhost:8000',
          changeOrigin: false,
          secure: false,
          ws: true,
        },
        '^/api/v1.*': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          headers: {
            // cookie: env.VITE_COOKIES,
            // Authorization: `Bearer ${env.VITE_TOKEN}`
          },
        },
      },
    },
  };
});
