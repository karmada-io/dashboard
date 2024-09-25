# Usage


```
import { BaiduTranslator } from '@karmada/translators'

const appId = 'please input your appId';
const appKey = 'please input your appKey';
(async function() {
    const translator = new BaiduTranslator(appId, appKey);
    // translate single entry
    const resp = await translator.translate({
      input: "word",
      from: "zh",
      to: "en",
    });
    
    // translate multi entries
    const resp = await translator.batchTranslate({
      input: ["word1", "word2", "word3"],
      from: "zh",
      to: "en",
    });
})()
```