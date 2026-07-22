import { readFile } from "node:fs/promises";
import vm from "node:vm";

// oxlint-disable-next-line typescript/no-extraneous-class -- Mirrors the PocketBase Field constructor API.
class Field {
  constructor(options) {
    Object.assign(this, options);
    this.id = `field-${options.name}`;
  }
}

class Fields {
  constructor(fields = []) {
    this.values = fields.map((field) => (field instanceof Field ? field : new Field(field)));
  }
  getByName(name) {
    return this.values.find((field) => field.name === name);
  }
  add(field) {
    this.values.push(field);
  }
  removeById(id) {
    this.values = this.values.filter((field) => field.id !== id);
  }
}

class Collection {
  constructor(options) {
    Object.assign(this, options);
    this.id = options.id ?? options.name;
    this.fields = new Fields(options.fields);
  }
  addIndex() {}
}

let recordId = 0;
class Record {
  constructor(collection) {
    this.collection = collection;
    this.id = `record-${++recordId}`;
    this.data = new Map();
  }
  set(name, value) {
    this.data.set(name, value);
  }
  getString(name) {
    return String(this.data.get(name) ?? "");
  }
}

const original = {
  passwordAuth: { enabled: true, identityFields: ["email"] },
  oauth2: { enabled: true, providers: [{ name: "original", clientId: "before" }] },
  rules: {
    listRule: "original-list",
    viewRule: "original-view",
    createRule: "original-create",
    updateRule: "original-update",
    deleteRule: "original-delete",
  },
  rateLimits: { enabled: false, rules: [{ label: "original", audience: "", duration: 1, maxRequests: 1 }] },
};
const users = new Collection({ type: "auth", name: "users", fields: [{ type: "text", name: "existing" }] });
users.passwordAuth = structuredClone(original.passwordAuth);
users.oauth2 = structuredClone(original.oauth2);
Object.assign(users, original.rules);
const settings = { rateLimits: structuredClone(original.rateLimits) };
const collections = new Map([[users.id, users]]);
const records = new Map();
const rawQueries = [];
const app = {
  db() {
    return {
      newQuery(sql) {
        return {
          execute() {
            rawQueries.push(sql);
          },
        };
      },
    };
  },
  findCollectionByNameOrId(name) {
    const collection = collections.get(name);
    if (!collection) throw new Error(`Missing collection ${name}`);
    return collection;
  },
  findFirstRecordByFilter(collectionId) {
    const record = records.get(collectionId)?.[0];
    if (!record) throw new Error(`Missing state record ${collectionId}`);
    return record;
  },
  save(value) {
    if (value instanceof Collection) collections.set(value.id, value);
    else if (value instanceof Record)
      records.set(value.collection.id, [...(records.get(value.collection.id) ?? []), value]);
  },
  delete(collection) {
    collections.delete(collection.id);
    records.delete(collection.id);
  },
  settings() {
    return settings;
  },
};

let migration;
const sandbox = {
  Collection,
  Record,
  TextField: Field,
  URLField: Field,
  FileField: Field,
  BoolField: Field,
  console,
  migrate: (up, down) => {
    migration = { up, down };
  },
};
const source = await readFile("apps/workshop/pb_migrations/1784240000_workshop_widgets.js", "utf8");
vm.runInNewContext(source, sandbox);
if (!migration) throw new Error("Workshop migration did not register");

migration.up(app);
if (!collections.has("workshop_migration_state") || settings.rateLimits.enabled !== true) {
  throw new Error("Workshop migration did not capture state before applying changes");
}
if (!rawQueries.some((query) => query.includes("CREATE TRIGGER submissions_revision_cas"))) {
  throw new Error("Workshop migration did not install the atomic submission revision guard");
}
migration.down(app);

if (JSON.stringify(users.passwordAuth) !== JSON.stringify(original.passwordAuth))
  throw new Error("Password authentication was not restored");
if (JSON.stringify(users.oauth2) !== JSON.stringify(original.oauth2))
  throw new Error("OAuth settings were not restored");
for (const [name, value] of Object.entries(original.rules)) {
  if (users[name] !== value) throw new Error(`User rule ${name} was not restored`);
}
if (users.fields.values.map((field) => field.name).join(",") !== "existing")
  throw new Error("Workshop user fields were not removed on rollback");
if (JSON.stringify(settings.rateLimits) !== JSON.stringify(original.rateLimits))
  throw new Error("Rate limits were not restored");
for (const name of ["workshop_migration_state", "workshop_listings", "reports", "comments", "votes", "submissions"]) {
  if (collections.has(name)) throw new Error(`Rollback left collection ${name}`);
}

console.log("Workshop migration up/down restoration passed");
