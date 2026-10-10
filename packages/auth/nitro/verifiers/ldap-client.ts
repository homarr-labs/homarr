import { Client } from "ldapts";
import type { Entry, SearchOptions as LdapSearchOptions } from "ldapts";

export interface BindOptions {
  distinguishedName: string;
  password: string;
}

export interface SearchOptions {
  base: string;
  options: LdapSearchOptions;
}

export type LdapEntry = Record<string, string | undefined> & { dn: string };

export interface LdapProtocol {
  bindAsync(options: BindOptions): Promise<void>;
  searchAsync(options: SearchOptions): Promise<LdapEntry[]>;
  disconnectAsync(): Promise<void>;
}

export type LdapTransport = Pick<Client, "bind" | "search" | "unbind">;

export class LdapClient implements LdapProtocol {
  constructor(private readonly client: LdapTransport) {}

  public async bindAsync({ distinguishedName, password }: BindOptions) {
    return await this.client.bind(distinguishedName, password);
  }

  public async searchAsync({ base, options }: SearchOptions) {
    const { searchEntries } = await this.client.search(base, options);

    return searchEntries.map((entry): LdapEntry => {
      const attributes = Object.fromEntries(
        Object.entries(entry).map(([key, value]) => [key, LdapClient.convertEntryPropertyToString(value)]),
      );
      return { ...attributes, dn: entry.dn };
    });
  }

  private static convertEntryPropertyToString(value: Entry[string]) {
    const firstValue = Array.isArray(value) ? (value[0] ?? "") : value;
    return typeof firstValue === "string" ? firstValue : firstValue.toString("utf8");
  }

  public async disconnectAsync() {
    await this.client.unbind();
  }
}

export const createLdapClient = (uri: string) => new LdapClient(new Client({ url: uri }));
