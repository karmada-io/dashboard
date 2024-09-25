import OpenAI from 'openai';
import {BatchTranslateInput, TranslateInput, Translator} from "./base";
import {sleepNs} from "./utils";

const OPENAI_LANG_MAP = {
    "zh-CN": "Chinese",
    "en-US": "English"
}

export class OpenAITranslator implements Translator {
    private baseUrl: string = '';
    private apiKey: string = "";
    private model: string = "";
    private client: OpenAI;

    constructor(opts: {
        baseUrl?: string;
        apiKey: string;
        model: string;
    }) {
        if (opts.baseUrl) {
            this.baseUrl = opts.baseUrl
        }
        this.apiKey = opts.apiKey
        this.model = opts.model
        const params = {
            apiKey: this.apiKey,
            model: this.model
        }
        if (this.baseUrl) {
            params["baseURL"] = this.baseUrl
        }
        this.client = new OpenAI(params);
    }

    generateSystemPrompt(from: string, to: string) {
        const aliasedFrom = OPENAI_LANG_MAP[from]
        const aliasedTo = OPENAI_LANG_MAP[to]
        return `You are a helpful assistant that translates ${aliasedFrom} text to ${aliasedTo} languages.`
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
        const originLocales = input.input
        const userContent = `Keep the JSON format. Do not include the english that is being translated or any notes. Only include the translated text. Make sure there are the same amount of open brackets as closed brackets. Translate the following text from Chinese to English: \n${JSON.stringify(originLocales)}`
        const chatCompletion = await this.client.chat.completions.create({
            messages: [
                {
                    "role": "system",
                    "content": this.generateSystemPrompt(input.from, input.to),
                },
                {role: 'user', content: userContent}
            ],
            model: this.model,
            temperature: 0,
        })
        const translations = JSON.parse(chatCompletion.choices?.[0]?.message?.content || "[]") as string[];
        const output = translations.map((item, index) => {
            return {
                src: input.input[index],
                dst: item
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
    interface OpenAITranslateContext {
        translator: Translator;
    }

    const {it, expect, beforeEach} = import.meta.vitest;

    const apiKey = process.env.APIKEY as string;
    const model = process.env.MODEL as string;
    const isValidConfig = !!apiKey;

    beforeEach<OpenAITranslateContext>(async (context) => {
        await sleepNs(1);
        context.translator = new OpenAITranslator({
            baseUrl: "https://burn.hair/v1",
            apiKey,
            model
        });
    });
    it<OpenAITranslateContext>("[OpenAI]translate in single entry mode", async ({
                                                                                    translator,
                                                                                    skip,
                                                                                }) => {
        if (!isValidConfig) {
            skip();
        }
        const input = "多集群";
        const output = "Multiple clusters";
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
    it<OpenAITranslateContext>("[OpenAI]translate in batch entry mode", async ({
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
            "Cluster",
            "Cloud Native",
            "Multi-cluster",
        ]);
    });
}
