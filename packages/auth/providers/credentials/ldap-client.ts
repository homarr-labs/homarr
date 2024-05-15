import type {
  Client,
  SearchOptions as LdapSearchOptions,
  SearchEntry,
} from "ldapjs";
import ldap from "ldapjs";

import { env } from "../../env.mjs";

export interface BindOptions {
  distinguishedName: string;
  password: string;
}

interface SearchOptions {
  base: string;
  options: LdapSearchOptions;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type SearchResult = Record<"dn" | (string & {}), string>;

export class LdapClient {
  private client: Client;

  constructor() {
    this.client = ldap.createClient({
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
    return new Promise<void>((resolve, reject) => {
      this.client.bind(distinguishedName, password, (err) => {
        if (err) {
          reject(err);
        }

        resolve();
      });
    });
  }

  /**
   * Search for entries in the LDAP server.
   * @param base base DN to start the search
   * @param options search options
   * @returns list of search results
   */
  public async searchAsync({ base, options }: SearchOptions) {
    return new Promise<SearchResult[]>((resolve, reject) => {
      this.client.search(base, options, (err, res) => {
        const entries: SearchResult[] = [];

        res.on("error", (err) => {
          reject(err);
        });

        res.on("searchEntry", (entry) => {
          entries.push(this.createSearchResult(entry));
        });

        res.on("end", (result) => {
          if (result?.status !== 0) {
            reject(new Error(`Search failed with status ${result?.status}`));
          }

          resolve(entries);
        });
      });
    });
  }

  /**
   * Creates a search result object from a search entry which contains a list of attributes with values.
   * Additionally, it extracts the distinguishedName from the entry.
   * @param entry search entry from ldap
   * @returns search result object
   */
  private createSearchResult(entry: SearchEntry): SearchResult {
    const reducedEntry = entry.pojo.attributes.reduce<Record<string, string>>(
      (object, attribute) => {
        // just take first element assuming there's only one (uid, mail)
        object[attribute.type] = attribute.values.at(0)!;
        return object;
      },
      {},
    );

    return {
      ...reducedEntry,
      dn: this.getEntryDn(entry),
    };
  }

  /**
   * dn is the only attribute returned with special characters formatted in UTF-8 (Bad for any letters with an accent)
   * Regex replaces any backslash followed by 2 hex characters with a percentage unless said backslash is preceded by another backslash.
   * That can then be processed by decodeURIComponent which will turn back characters to normal.
   * @param entry search entry from ldap
   * @returns normalized distinguishedName
   */
  private getEntryDn(entry: SearchEntry) {
    try {
      return decodeURIComponent(
        entry.pojo.objectName.replace(/(?<!\\)\\([0-9a-fA-F]{2})/g, "%$1"),
      );
    } catch {
      throw new Error(
        `Cannot resolve distinguishedName for the entry ${entry.pojo.objectName}`,
      );
    }
  }

  /**
   * Disconnects the client from the LDAP server.
   */
  public disconnect() {
    this.client.destroy();
  }
}
