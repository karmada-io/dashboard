// import got from "got";
import { Translator, TranslateInput, BatchTranslateInput, LANG } from "./base";
import { calMD5, sleepNs } from "./utils";

interface BaiduTranslateResult {
  error_code?: string;
  error_msg?: string;
  from: LANG;
  to: LANG;
  trans_result: Array<{
    src: string;
    dst: string;
  }>;
}

const BD_LANG_MAP = {
  "zh-CN": "zh",
  "en-US": "en"
}

export class BaiduTranslator implements Translator {
  private readonly appId: string;
  private readonly appKey: string;
  private apiUrl: string =
    "https://api.fanyi.baidu.com/api/trans/vip/translate";
  constructor(appId: string, appKey: string) {
    this.appId = appId;
    this.appKey = appKey;
  }

  async translate(input: TranslateInput) {
    const batchInput: BatchTranslateInput = {
      input: [input.input],
      from: input.from,
      to: input.to,
    };
    try {
      const batchOutput = await this.batchTranslate(batchInput);
      return {
        output: batchOutput.output[0],
        from: batchOutput.from,
        to: batchOutput.to,
      };
    } catch (e) {
      throw e;
    }
  }

  async batchTranslate(input: BatchTranslateInput) {
    const salt = new Date().getTime().toString();
    const aliasedFrom = BD_LANG_MAP[input.from]
    const aliasedTo = BD_LANG_MAP[input.to]
    const query = input.input.join("\n");
    const sign = calMD5(this.appId + query + salt + this.appKey);
    try {
      const options = {
        headers: {
          "Content-Type": "application/json",
        },
        searchParams: new URLSearchParams({
          q: query,
          appid: this.appId,
          salt: salt,
          from: aliasedFrom,
          to: aliasedTo,
          sign: sign,
        }),
      };
      const {default: got} = await import('got')
      const data = await got
        .get(this.apiUrl, options)
        .json<BaiduTranslateResult>();
      if (data.error_code && data.error_msg) {
        throw new Error(`[BaiduTranslator] translate err:${data.error_msg}`);
      }
      return {
        output: data.trans_result,
        from: data.from,
        to: data.to,
      };
    } catch (e) {
      throw e;
    }
  }
}

if (import.meta.vitest) {
  interface BaiduTranslateContext {
    translator: Translator;
  }
  const { it, expect, beforeEach } = import.meta.vitest;

  const appId = process.env.BD_APPID as string;
  const appKey = process.env.BD_APPKEY as string;
  const isValidConfig = appId && appKey;

  beforeEach<BaiduTranslateContext>(async (context) => {
    // extend context
    await sleepNs(1);
    context.translator = new BaiduTranslator(appId, appKey);
  });
  it<BaiduTranslateContext>("translate in single entry mode", async ({
    translator,
    skip,
  }) => {
    if (!isValidConfig) {
      skip();
    }
    const input = "测试中文";
    const output = "Test Chinese";
    const resp = await translator.translate({
      input,
      from: "zh-CN",
      to: "en-US",
    });
    expect(resp.from).toBe("zh");
    expect(resp.to).toBe("en");
    expect(resp.output.src).toBe(input);
    expect(resp.output.dst).toBe(output);
  });
  it<BaiduTranslateContext>("translate in batch entry mode", async ({
    translator,
    skip,
  }) => {
    if (!isValidConfig) {
      skip();
    }
    const resp = await translator.batchTranslate({
      input: ["集群", "云原生", "多云"],
      from: "zh-CN",
      to: "en-US",
    });
    expect(resp.from).toBe("zh");
    expect(resp.to).toBe("en");
    expect(resp.output.map((item) => item.src)).toEqual([
      "集群",
      "云原生",
      "多云",
    ]);
    expect(resp.output.map((item) => item.dst)).toEqual([
      "colony",
      "Cloud native",
      "cloudy",
    ]);
  });
}
