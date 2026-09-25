import type { Entry, SearchOptions as LdapSearchOptions } from "ldapts";
import { Client } from "ldapts";

import { objectEntries } from "@homarr/common";

import { env } from "../../env";

export interface BindOptions {
  distinguishedName: string;
  password: string;
}

interface SearchOptions {
  base: string;
  options: LdapSearchOptions;
}

export class LdapClient {
  private client: Client;

  constructor() {
    this.client = new Client({
      url: env.AUTH_LDAP_URI,
    });
  }

  /**
   * Binds to the LDAP server with the provided distinguishedName and password.
   * @param distinguishedName distinguishedName to bind to
   * @param password password to bind with
   * @returns void
   */
  public async bindAsync({ distinguishedName, password }: BindOptions) {
    return await this.client.bind(distinguishedName, password);
  }

  /**
   * Search for entries in the LDAP server.
   * @param base base DN to start the search
   * @param options search options
   * @returns list of search results
   */
  public async searchAsync({ base, options }: SearchOptions) {
    const { searchEntries } = await this.client.search(base, options);

    return searchEntries.map((entry) => {
      return {
        ...objectEntries(entry)
          .map(([key, value]) => [key, LdapClient.convertEntryPropertyToString(value)] as const)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, string>),
        // Keep RFC 4514 escaping intact for the subsequent user bind.
        dn: entry.dn,
      } as {
        [key: string]: string;
        dn: string;
      };
    });
  }

  private static convertEntryPropertyToString(value: Entry[string]) {
    const firstValue = Array.isArray(value) ? (value[0] ?? "") : value;

    if (typeof firstValue === "string") {
      return firstValue;
    }

    return firstValue.toString("utf8");
  }

  /**
   * Disconnects the client from the LDAP server.
   */
  public async disconnectAsync() {
    await this.client.unbind();
  }
}
