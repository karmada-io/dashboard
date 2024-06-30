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
