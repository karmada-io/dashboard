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
import { execSync } from 'node:child_process';
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

function runGitCommand(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const license = getLicense();
  const env = loadEnv(mode, process.cwd(), '');
  const gitTag = runGitCommand('git tag --points-at HEAD | head -n 1');
  const gitCommit = runGitCommand('git rev-parse --short=8 HEAD') || 'unknown';
  const repoUrl =
    env.VITE_DASHBOARD_REPO_URL || 'https://github.com/karmada-io/dashboard';

  return {
    base: process.env.NODE_ENV === 'development' ? '' : '/static',
    define: {
      __DASHBOARD_GIT_TAG__: JSON.stringify(gitTag),
      __DASHBOARD_GIT_COMMIT__: JSON.stringify(gitCommit),
      __DASHBOARD_REPO_URL__: JSON.stringify(repoUrl),
    },

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
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        // Vite 8 + rolldown has a CJS transform issue with es-toolkit compat modules
        // used by recharts. Map them to equivalent lodash helpers to avoid runtime errors.
        { find: 'es-toolkit/compat/get', replacement: 'lodash/get' },
        { find: 'es-toolkit/compat/sortBy', replacement: 'lodash/sortBy' },
        { find: 'es-toolkit/compat/maxBy', replacement: 'lodash/maxBy' },
        { find: 'es-toolkit/compat/sumBy', replacement: 'lodash/sumBy' },
        { find: 'es-toolkit/compat/throttle', replacement: 'lodash/throttle' },
        { find: 'es-toolkit/compat/omit', replacement: 'lodash/omit' },
        { find: 'es-toolkit/compat/minBy', replacement: 'lodash/minBy' },
        { find: 'es-toolkit/compat/last', replacement: 'lodash/last' },
        { find: 'es-toolkit/compat/range', replacement: 'lodash/range' },
        { find: 'es-toolkit/compat/isPlainObject', replacement: 'lodash/isPlainObject' },
        { find: 'es-toolkit/compat/uniqBy', replacement: 'lodash/uniqBy' },
        { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react') },
        { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom') },
      ],
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
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
        '^/clusterapi/*': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          headers: {
            // cookie: env.VITE_COOKIES,
            // Authorization: `Bearer ${env.VITE_TOKEN}`
          },
        },
        '^/clusterapi/[^/]+/api/v1/terminal/sockjs': {
          target: 'ws://localhost:8000',
          changeOrigin: false,
          secure: false,
          ws: true,
        },
        '^/metrics-scraper/.*': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
