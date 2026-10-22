/**
 * Minimale Typdeklaration für `imapflow` (v1.0.x liefert keine .d.ts aus).
 * Deckt nur die im mailService verwendete Teilmenge der API ab. Falls später
 * weitere Methoden gebraucht werden, hier ergänzen.
 */
declare module "imapflow" {
  interface ImapFlowOptions {
    host: string;
    port: number;
    secure?: boolean;
    auth: { user: string; pass: string };
    logger?: false | object;
    [key: string]: unknown;
  }

  interface MailboxLock {
    release: () => void;
  }

  interface AddressObject {
    name?: string;
    address?: string;
  }

  interface Envelope {
    messageId?: string;
    from?: AddressObject[];
    subject?: string;
  }

  interface FetchQueryObject {
    source?: boolean;
    envelope?: boolean;
    [key: string]: unknown;
  }

  interface FetchMessageObject {
    uid: number;
    source?: Buffer;
    envelope?: Envelope;
    [key: string]: unknown;
  }

  interface SearchObject {
    seen?: boolean;
    [key: string]: unknown;
  }

  export class ImapFlow {
    constructor(options: ImapFlowOptions);
    connect(): Promise<void>;
    logout(): Promise<void>;
    close(): void;
    getMailboxLock(path: string): Promise<MailboxLock>;
    search(query: SearchObject): Promise<number[] | false>;
    fetchOne(
      range: string,
      query: FetchQueryObject,
    ): Promise<FetchMessageObject | false>;
    messageFlagsAdd(range: string, flags: string[]): Promise<boolean>;
  }
}
