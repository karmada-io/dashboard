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

export const LangDictionary = [
    {
        cnName: '中文(繁体)',
        enName: 'zh-CN',
        canDetect: true,
    },
    {
        cnName: '英语',
        enName: 'en-US',
        canDetect: true,
    },
]

export type LANG = 'auto' | 'zh-CN' | 'en-US'



export interface TranslateInput {
  input: string;
  from: LANG;
  to: LANG;
}
export interface TranslateOutput {
  output: {
    src: string;
    dst: string;
  };
  from: LANG;
  to: LANG;
}

export interface BatchTranslateInput {
  input: string[];
  from: LANG;
  to: LANG;
}
export interface BatchTranslateOutput {
  output: Array<{
    src: string;
    dst: string;
  }>;
  from: LANG;
  to: LANG;
}


export interface Translator {
  translate(input: TranslateInput): Promise<TranslateOutput>;
  batchTranslate(input: BatchTranslateInput): Promise<BatchTranslateOutput>;
}
