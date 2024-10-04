import {BatchTranslateInput, LANG, TranslateInput, Translator} from "./base";
import {sleepNs} from "./utils";

interface DeepLTranslateResult {
    translations: Array<{
        detected_source_language: string;
        text: string;
    }>;
}


const DEEPL_LANG_MAP = {
    "zh-CN": "ZH",
    "en-US": "EN"
}

export class DeepLTranslator implements Translator {
    private apiUrl: string = 'https://api-free.deepl.com/v2/translate';
    private authKey: string = "";

    constructor(authKey: string) {
        this.authKey = authKey;
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
        const aliasedFrom = DEEPL_LANG_MAP[input.from]
        const aliasedTo = DEEPL_LANG_MAP[input.to]
        const {default: got} = await import('got')
        const options = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `DeepL-Auth-Key ${this.authKey}`
            },
            json: {
                "text": input.input,
                "source_lang": aliasedFrom,
                "target_lang": aliasedTo,
            }
        }
        const data = await got
            .post(this.apiUrl, options)
            .json<DeepLTranslateResult>();
        const output = data.translations.map((item, index) => {
            return {
                src: input.input[index],
                dst: item.text
            }
        })
        return {
            output: output,
            from: input.from,
            to: input.to,
        };
    }
}


if (import.meta.vitest) {
    interface DeepLTranslateContext {
        translator: Translator;
    }

    const {it, expect, beforeEach} = import.meta.vitest;

    const authKey = process.env.DEEPL_AUTHKEY as string;
    const isValidConfig = !!authKey;

    beforeEach<DeepLTranslateContext>(async (context) => {
        await sleepNs(1);
        context.translator = new DeepLTranslator(authKey);
    });
    it<DeepLTranslateContext>("[DeepL]translate in single entry mode", async ({
                                                                                  translator,
                                                                                  skip,
                                                                              }) => {
        if (!isValidConfig) {
            skip();
        }
        const input = "多集群";
        const output = "multi-cluster";
        const resp = await translator.translate({
            input,
            from: "zh-CN",
            to: "en-US",
        });
        expect(resp.from).toBe("zh-CN");
        expect(resp.to).toBe("en-US");
        expect(resp.output.src).toBe(input);
        expect(resp.output.dst).toBe(output);
    });
    it<DeepLTranslateContext>("[DeepL]translate in batch entry mode", async ({
                                                                          translator,
                                                                          skip,
                                                                      }) => {
        if (!isValidConfig) {
            skip();
        }
        const resp = await translator.batchTranslate({
            input: ["集群", "云原生", "多集群"],
            from: "zh-CN",
            to: "en-US",
        });
        expect(resp.from).toBe("zh-CN");
        expect(resp.to).toBe("en-US");
        expect(resp.output.map((item) => item.src)).toEqual([
            "集群",
            "云原生",
            "多集群",
        ]);
        expect(resp.output.map((item) => item.dst)).toEqual([
            "clustering",
            "cloud native",
            "multi-cluster",
        ]);
    });
}
