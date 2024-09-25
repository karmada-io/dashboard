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
