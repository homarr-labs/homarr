import type { Client } from "ldapjs";
import { createClient } from "ldapjs";

import { env } from "../../env.mjs";

interface BindOptions {
  distinguishedName: string;
  password: string;
}

class LdapClient {
  private client: Client;

  constructor() {
    this.client = createClient({
      url: env.AUTH_LDAP_URI,
    });
  }

  public async connectAsync() {
    return new Promise<void>((resolve, reject) => {
      this.client.bind(
        env.AUTH_LDAP_BIND_DN,
        env.AUTH_LDAP_BIND_PASSWORD,
        (err) => {
          if (err) {
            reject(err);
          }

          resolve();
        },
      );
    });
  }
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

  private disconnect() {
    this.client.destroy();
  }
}

export const createLdapClient = () =>
  new Promise<Client>((resolve, reject) => {
    const client = createClient({
      url: env.AUTH_LDAP_URI,
    });

    client.bind(env.AUTH_LDAP_BIND_DN, env.AUTH_LDAP_BIND_PASSWORD, (err) => {
      if (err) {
        reject(err);
      }

      resolve(client);
    });
  });
