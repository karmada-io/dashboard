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

declare module 'zmodem.js/src/zmodem_browser' {
  type to_terminal = (octets: Iterable<number>) => void;

  export function sender(octets: Iterable<number>): void;

  export function on_retract(): void;

  export function on_detect(detection: Detection): void;

  export function on_progress(_: any, offer: Zmodem.Offer): void;

  class Sentry {
    constructor({
      to_terminal: to_terminal,
      sender: sender,
      on_retract: on_retract,
      on_detect: on_detect,
    });

    consume(data: string | ArrayBuffer | Uint8Array | Blob): void;
  }

  type Session = any;
  type Detection = any;
  type Offer = any;

  type send_files = (
    session: Session,
    files: FileList,
    { on_progress: on_progress },
  ) => Promise<void>;
  const Browser = {
    send_files: send_files,
  };
}
