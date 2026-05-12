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

const gitTag = __DASHBOARD_GIT_TAG__;
const gitCommit = __DASHBOARD_GIT_COMMIT__ || 'unknown';
const repoUrl = __DASHBOARD_REPO_URL__;

const normalizeRepoUrl = (url: string): string => url.replace(/\/+$/, '');

export const getDashboardVersionInfo = (): {
  versionKind: 'tag' | 'commit' | 'unknown';
  displayVersion: string;
  targetUrl: string;
  title: string;
} => {
  const normalizedRepoUrl = normalizeRepoUrl(repoUrl);

  if (gitTag) {
    return {
      versionKind: 'tag',
      displayVersion: gitTag,
      targetUrl: `${normalizedRepoUrl}/tree/${gitTag}`,
      title: `Tag: ${gitTag}`,
    };
  }

  if (gitCommit !== 'unknown') {
    return {
      versionKind: 'commit',
      displayVersion: gitCommit,
      targetUrl: `${normalizedRepoUrl}/commit/${gitCommit}`,
      title: `Commit: ${gitCommit}`,
    };
  }

  return {
    versionKind: 'unknown',
    displayVersion: gitCommit,
    targetUrl: normalizedRepoUrl,
    title: 'Version info unavailable',
  };
};
