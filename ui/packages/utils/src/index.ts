/*
Copyright 2025 The Karmada Authors.

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

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * return karmada license content according to year.
 * @param year optional, if not set year, use currentYear instead
 */
export function getLicense(year: string = ''): string {
  const __filename = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(__filename);
  // __filename in dist dir
  const workspaceRootDir = path.resolve(currentDir, '../../../../');
  const licenseTplPath = path.join(
    workspaceRootDir,
    './hack/karmada-license.tpl',
  );
  const tplContent = fs.readFileSync(licenseTplPath).toString();

  let _year = year;
  if (_year === '') {
    _year = new Date().getFullYear().toString();
  }
  return tplContent.replace(/\{\{year\}\}/g, _year);
}
