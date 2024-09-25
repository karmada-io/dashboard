import * as crypto from "crypto";

export function calMD5(data: string) {
  const hash = crypto.createHash("md5");
  hash.update(data);
  return hash.digest("hex");
}

export function sleepNs(n: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, n * 1000);
  });
}
