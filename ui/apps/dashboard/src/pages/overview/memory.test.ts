/*
Copyright 2026 The Karmada Authors.

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

import { describe, expect, it } from 'vitest';
import { bytesToGiB, formatGiB } from './memory';

describe('bytesToGiB', () => {
  it('converts bytes to binary GiB', () => {
    expect(bytesToGiB(1024 ** 3)).toBe(1);
  });
});

describe('formatGiB', () => {
  it('rounds to 2 decimals', () => {
    // 2515.0407180786133 GiB used to render unrounded on the overview page.
    expect(formatGiB(2515.0407180786133 * 1024 ** 3)).toBe('2515.04');
  });

  it('keeps 2 decimals for whole values', () => {
    expect(formatGiB(8 * 1024 ** 3)).toBe('8.00');
  });
});
