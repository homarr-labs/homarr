import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { MigrationMeta } from "drizzle-orm/migrator";

import type { CopiedCatalogReader } from "./copied-runtime-catalog";
import type { CopiedSqlRow } from "./copied-sqlite";
import sqliteJournal from "./migrations/sqlite/meta/_journal.json";
import postgresqlJournal from "./migrations/postgresql/meta/_journal.json";
import sqliteSnapshot from "./migrations/sqlite/meta/0050_snapshot.json";
import postgresqlSnapshot from "./migrations/postgresql/meta/0018_snapshot.json";
import { runtimeCatalog } from "./runtime-catalog";

export type MainTargetEngine = "sqlite" | "postgresql";

export interface MainTargetBundle {
  readonly engine: MainTargetEngine;
  readonly identity: string;
  readonly migrationCount: number;
  readonly runtimeAnchorIndex: number;
  readonly migrations: readonly MigrationMeta[];
}

const sqliteSqlPins = [
  "c6fd51d50bbe0a63eaab178e83dc81b202a9b6eb5fe714abfb8a1c19a45b7a44",
  "058465bfa0947ad8894abf2a20dcf4976b896978e7a74faa805e06055d852fc2",
  "70cc9f161df3df995279ac89f3df957669047afa59f55cb2a0e6723f3bee4c3d",
  "10ccb5e8f52c0aa600c653d002e7d22090dd3e0ea70d13285c0aacb8ca655bfb",
  "a380540721b601bee0317d30272a23cf8d4a8955413d4d8ec6232ca516097e05",
  "f459640296a99c99f9d62f971e66e7a81804257140f7d0414b54deac5acd1deb",
  "cbf3736bed4b6966aa0cf04ef56f879f22dba6305fabfde94224ab5432ee413c",
  "721592bdc44fdff9efa3234f8d7172ca1a61d3aff5ff3fc5725b0c6df23839c6",
  "6de721f09f78dad924abb9f5f4328dae76a316914f9b5f04570033acbd86ad54",
  "3688327ce98d497d7684bca6de72ecf2df6a91d4400a6559674cb4d9ec60e2ef",
  "1375278b167980e9cfab9252e7e509add547d8465875b8f7f2d814e68b98dea1",
  "db7cd838e954be9cf9853187d77a83920663589094399ff00f05f29393c80058",
  "ba5ea9ed055770015302e46411b36104060e227117a6e09625494e75e3e62836",
  "28a87e76d5726e3e6c32c85e2ab8f345b47878c35c7d70f8353f19607c049adb",
  "3e18defeed7f3e3b07db1fcc3441ddf184cdd814fa61fd0b0a061360859a0bff",
  "a645a5bb21b331c51b38e8ca4cc053f9d1ee07bc343b93687212680c6142400b",
  "26a9895c88eb9ac339640de8da7d76b74f81017aa51ec95fbeb8185f717abe8a",
  "f0eca4ae890a552231b1906e9e3bb4664000ee3f6d2871c84025e86576375559",
  "798af2ff160a9193528328341327655a2a8ff731c90af1372490259830b7468b",
  "0e3d2739b77c0bf0bc78d587e5b777feb2fd76430033bb30ddef9c1d42318cee",
  "d6860fd993742cdb7d12c0ad8be5beeb5e6d81b7fd9a900d89770fce9a480a38",
  "04b12c3285cec666f61e47684c22ef90e551b21de692a5bac08878e782b44afe",
  "560b656f92946b97c7ed5aeb843912f1d3050bec8ed32a0c69298b7a26ea2f5c",
  "9086b777a1ea9346ac3213e7281a325330c99764dbb7319d7dd7c2d526209bfc",
  "0b4404d37e81c6770bc73795e3f93b10e7ceaf94633bf3ed54d1029418a91b4e",
  "62fede19625d4f74e79b84cae992abedbc65d54786f4aae272bac629c1013ff2",
  "a0f2add9ef93d36b90055049b8147753d58246c44f719b5ebcc7f6464b859378",
  "21ca1fa3959681191bcd735068b3fb2efd5cd8d1c7da29dd6cc2ca00365092a8",
  "03a502c9f0716354196180af98cd506182d1dbfb6480c6d26bd94d76375fe5a4",
  "17f2e70f28737ee06bb02ed3044cce54b9c3cf2c740dfaa50b2c6d5e38023b54",
  "c25e11095c7118ad7d555db32d9885b509a203592f341302a8b011c5908bc6b2",
  "55979c264bda530a9a03b35fa28240aa842e96c898ddb16aff8ceebadbae2b70",
  "946f889f8e28301fbeba6ec5ffb4ef7dd6de87354040dca440b1946bd8cc7dbd",
  "d7a634088f188021db0d963eb6340d23d8ff3091d3c7b45ea1f973e3082a4f9f",
  "54300d3a35b8a832d98d5c810e1712bf9d776290a678fa92db303affab1963ae",
  "bfc29ee6e393c7c3d0d54e0e5767a7687cfdf36dd477f1e09f66fb15dde4d12d",
  "2f1af4ef0c08b7e9ee42a611fa553b1abf42d678ba851add31e436614fafa87d",
  "1e03e457d2a8a5b55e17354d16b492ac8f4840471ba6eb43b2df0cbb20d89a9c",
  "56fdb07c0992ccb1c3c591424067b144a87057796756049fee1b6a1f94e3d7f7",
  "5f6edb156d510dec14c8331b6960835a76bba70ae02c43753d007f67325abf71",
  "0738021b96feac0ae6b5d41fb070fc8457c5deda8726c02bd524a219076076f1",
  "85474151c7a89d1fc48f969f952f45dd8d8f1417377dbf783171d15719b0fa9a",
  "d951ccac7ef87b4c4d95f2cd4d1ace06f7f1c8d3571970c5e5b59089350b925b",
  "44e2b37644924707dca0debde4f928a9736c9015695c59a6d3d5ed17b175001e",
  "7b1e8ca7822d527def3ae3ac5b9a5e6215de5abaaeb75cee64f40abb73311438",
  "9f1ca3ce4db96ae24fc262c7c226a3b6b480ad203a62b168bbe9868b347ea092",
  "57abf183531d37b7ac32c6a7319b0169ad847d57217fb6e21308b5bdd4be7be1",
  "69692ea9f7fa98de8ccb1a7b9664f484a59cc344731e50b3c5ef2521ee6df147",
  "a838e39fd4ebf48d66c7d9cee9efae902d22c1e509b2255adcd5b7886a16c49f",
  "29d003efc340625e9539d5a133508cb98e6e66342934d295855577074643141e",
  "b521f900b160fb1256790be8e1bda41ce550ca7325bd480544bc969ac62e1108",
];

const sqliteSnapshotPins = [
  "fcb9bedbc2169b6e63fd31667f132e8944d9616e63002540c203c539ff04d293",
  "a7e345f83a0e00622860315f51c61e4d8cbebaec3c2236a157c20085d2f1ed81",
  "72a432c77f849f7055445d1165e18193abec9349927139daadf0f844a6504a99",
  "89eff8be29f32a222565972863e2a2b9e1c645149cb4c6567b44a9a053f73acc",
  "bd3971e9bb1940f355d789e84bba8f5e483748648d53066604725fffbf31b399",
  "200e17d623630a8e4145416e48317b5f7860d7424648b5f3eb06b98f00877560",
  "498e20d6e2be81890e8258b8b0ab574856d762c9cea92d72053086332522a79f",
  "19d7526e9c8200b2b02678686afa39f88f0df337940fe59eaa6d65340f145240",
  "7feb530ed6919facfca9cb894a9ec17113236bd17be683ff34a86ec20bbd301a",
  "e9eb0422bcdde512d5fd8cc32bd491c0d10477c7faa1ebf245890bc4d6c51ca9",
  "d1189f2ceb98a60a4ab0be71683edfa41c1a53b3e7af998fd768a1702025af25",
  "ea1a997d9cb21473c7a1fae642321183150ff08feddab1a5cba37e4064031cb1",
  "251724627dc14d1cf7ae7d2da80a48bda6d6f3f9049fa428b1b8b4799187aa36",
  "5ce32703509569e227ee0682c72e96e391356b052f11e35bf332d02fe4da8873",
  "adaa0829fde20aff4d0b04338bb152ea12821d477b4585d7df2ae78502380b7a",
  "bf6ef057137db4e2fb58a486e2464116258136abec5094aabffad041b9183001",
  "43aedc30e48c00e008ecc1133527f1353f45416598fa7fe5148e2a9aadc0e436",
  "423844858824a4de0ddffca8b20ba097cd5bf4826b4e4ae5edb5978aeb495a1f",
  "e548f8fe8b1136426583cba05dfb005127bbf7269e9e5ef114c47a43e4abd84c",
  "3412c39783b68ff991bb3fd5fcc885db764bba00cf2b64296dad0b01f57657b5",
  "71dfc403542cea9a2b78d2a193d10cc204d9f33e94c8df99ffa123aff346495d",
  "1ccf7994005dcd1cd43816785542f7f8ec90e0512b3e9a17da6573c19bb24d71",
  "172e2eec3a89bd383323d542b5b05662333093c27a8ccc859f2f029d48199c9f",
  "1aeb7c6c2ac9e34d32e720356462a81634c20eebd24adcc525661692af8b7099",
  "61b6c76824680be216e4a27a65e86b254a25ca5f3fc006764b735e2b299fb8c1",
  "6a12ed9120371d6347ba762adb08e90748fb9b78daf279b6b051334ff1c9bf32",
  "3dd55043159d6884d38820a1b791b2d452f7f13e53aa1876919475738fa07f82",
  "e7af36d72232a2ee9e268fe5fe9604b50955a3f31aa654e091e9300e090501d3",
  "e02944c9d01a190c8aae8261b703e393df8b35069dd36ab51db59bfa6af9942a",
  "5d657b0c5c594834fa7a0dd8298227f98b09f928deeb815a862f012ec4b2e8af",
  "42267f940cd3b2c1b81da89756ac2166386a5b58f0baa99ea86e99673054ecd0",
  "e263f7299348efe3f12a53f3c9cb9ba023bcde1d5b7abe88720cf666a107d1d0",
  "c18f0d4ca900dd4fd5c7a9918df9cb6f5569e9bc80a812ebc46bc2c2e8256ee7",
  "d8d7ffe515330b62c42f059d389c6efd492363838611e0142cbba27fa6427188",
  "46da0c3c26c904190483c701220a3613835e24c9d29c932a58c59db301db0261",
  "4a4b96a51063ea8fde2fdcadc0494e60c17adc4e63613c898461e429f14b888d",
  "4919812d9b1980ac0201e3aca7a1bd9bbdcecaa17c9e1e4a4e67b0f53b886f02",
  "2638b08646bc113646a43a52ada42002979514b1a884ce368eca7dd1ab224c38",
  "681ef3e62899a72ab56c9a6f004f37655913b3d6800b44bfc9d22a55d1338ff4",
  "079cb58eb5b9474813ab8d22be19bcb15f942d094e7271d08c4f342a26d9fdb0",
  "5f056b151874791f0d13cae770f7b5b3456f6d961f9c10a3b0804f4c09fcdbe9",
  "bff19068da2998a41ae28b6431370854d9346c37ddbda8a8c1fca247f760eba6",
  "aaf19c9230924e7a1f7c9d57c2a87926d951093ed5de38ebf6bbb6472c1d29e8",
  "f627e33cd55ec2e0b280e3155cf6befd068f155a53161d2c798dd152f1c1468f",
  "c808f46538442196356be2b2a6a8af06fbfe0ae863984da6f1c5ec7dc6042972",
  "edfd54d065350967858e073dedac99dd9d5a060be3e1cc235963e2eae8278d84",
  "a2c3aed27833d7c7ec4b8e88e5d9a8f04210741a433310b6071c23cb8658853f",
  "2680e81ecc3929f601627b77bc785326c06e051207316dd918f6c661d6025176",
  "ce623c2ded5c046ba25852914665c030d6cb31458e2b27e1a70ba5f8edc2abde",
  "c34fa23c8b1caa400ce0e2082d715cffefba05a5078e4b904512ed0835bd17f1",
  "069e9a6f6143119845d1de74a769b53ca9eded045abe516ebc315087ea0d9703",
];

const postgresqlSqlPins = [
  "3fca8d153f6284501dcca0b43f631b72d19bdb36ffd0e00c2bf51084ce2a334d",
  "a5670dd7e9e8282107afeaa99d44b808f6bb688c3e9a298cc2b413bd1ab62ef5",
  "3869efc8422c8ec2e0ce3342e15c198568755aaf9b658d1f5a522e0c78548743",
  "5ce370e709dcd453a4286bef2e46ab54a5a5f41f1fa5994b2a6f52e182da99ec",
  "e26c91732dff01e88a2042825cd340b1d34171a90f1a0a699135e7f35214b27f",
  "c471ea6ef9168718c749c20a9660b530835dfcdf5b8ee7249dcd40ff194c0672",
  "7e40914aede7574363a760b74977c31545cf186c46dab166f2e0557c52662086",
  "9522abe3200df00391f513d1cc969cd55ddb5b23aee8867bce4e3a58c00ef605",
  "5b4a43d7e9a1116956a2988241ee7e1684c49d1de064c511915b59849605d390",
  "6436c15d107091f34996cbc4b16723c7c53da47c5667c0db2e48b957db04f342",
  "4ddc30354acd6d59426fdd184b2f9c64d93f425f32ed1dae360fbf06c44d35fc",
  "9a8f30d6a51a9b231284e76df2e0afda6fd0d17fafdc1fd3dc8cc1516b96948d",
  "603dfa12bf723f43c9f01b44c693c2afdf6705e6014a37143b2c4fcce0f5e4a8",
  "39190a4a229717c32333d1333c798bff003263df43f0f69b8fc66a8ff004d142",
  "d191cae5327e33dc5c49256bd6dff8482dfa390f7850beeed20c1060c40d3209",
  "67fe7ecf901fea1137b7bbf4cace936db0676f197ee4cf425277c662f9e56558",
  "3fd1430379cd159678f0322e4373c14f1714d47b4c8ddf83378609161c29f8da",
  "5ca45b95e8d355064a2cd0317c7c5f56b2aab2cc4868fdb2ca32564b5ee81529",
  "dafe9a445ec5e2aee227912461f405bc6f1ad2835ab1a1306a9c736eec85309d",
];

const postgresqlSnapshotPins = [
  "91817fa25f6d1d636d0f794379721dc0851a45bbacf12963eb9c02fd6c8cb87b",
  "d1a464c5b17b54a79d12a31ad963ba0868cbc8a848720431b3812a0b2552b3a8",
  "d945b86a1475a5e93bf38fc81e8dcca272e03c64fca4d10161cd743a5d40d2bd",
  "d0078f1a209aeda5420c5f717016ef9a3f6bdfbd9a56b061559fdfaa2c229048",
  "fb6ab5ec78d18b7bca4ae32f3270f5dd5b5a998cbd3aca70fd14f014e6cc4926",
  "6281d4a1ca7f5dae33db7ccf366107823d07ac091e6cb2247519599ec98dcd85",
  "1c397d9449bdd82e45fe3d73200e905d5f29dd0edb028f71864e3eb8942759cf",
  "f2d9810e4a8d431470c1c1eb3add5d1406163be6b9be8222ba03719fa5161770",
  "d21b45f080bc9109d877ad1ec746b590b3e5aa4f586454f9ca4c33b83000f90b",
  "e972a495f0d73ff6286d199131f5bf75b3506efa7b4414390bb2973adb42e988",
  "de7e9b0e10df7b530ca6aff420e748834ee90a4e4dd43e2a3fce09f3f6ec894d",
  "287aeaeff111c4704ead73f22322aeb1f420fad6433c6000196180d70642c6da",
  "103f74f23c2e9bc52fe4dc118fa03ec7f183d22f0499f79bf5f6e180571dad21",
  "453ca0c000523880b341d2f057c7c91d92f46f88b76232768cb0d71a48018b85",
  "f4645103138557752f2909a9017db5a6059158d9080620bdd11d53a27ab40e69",
  "4343d6a3dc5f43642ed5edc3493a54462aad9061f6c3c8867ccb5a76eacc6deb",
  "993501220347415d4e21f2f22a07f70786efc8f663fa627dacf4986d8ae2d877",
  "402debe006db3382d23f1077727396d1c13050633d6f247c5d92f6d491ccf81f",
  "7c9a7c6ad4ca1ba2909f30dca68317a4b7b3ed5744c00c68b614a9f1af24a549",
];

const reject: () => never = () => {
  throw new Error("Unsupported authenticated main target");
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const freeze = (value: unknown): void => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freeze(child);
  Object.freeze(value);
};
for (const value of [
  sqliteJournal,
  postgresqlJournal,
  sqliteSnapshot,
  postgresqlSnapshot,
  sqliteSqlPins,
  sqliteSnapshotPins,
  postgresqlSqlPins,
  postgresqlSnapshotPins,
])
  freeze(value);

const readAsset = (path: string): string => {
  if (!lstatSync(path).isFile()) return reject();
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size < 1 || stat.size > 1024 * 1024) return reject();
    const bytes = Buffer.alloc(stat.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = readSync(fd, bytes, length, bytes.length - length, length);
      if (read === 0) break;
      length += read;
    }
    if (length !== stat.size) return reject();
    const text = bytes.subarray(0, length).toString("utf8");
    if (!Buffer.from(text, "utf8").equals(bytes.subarray(0, length))) return reject();
    return text;
  } finally {
    closeSync(fd);
  }
};

const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

const runtimeAnchors = {
  sqlite: { migration: { ...runtimeCatalog.sqlite.migration }, snapshot: { ...runtimeCatalog.sqlite.snapshot } },
  postgresql: {
    migration: { ...runtimeCatalog.postgresql.migration },
    snapshot: { ...runtimeCatalog.postgresql.snapshot },
  },
};
freeze(runtimeAnchors);

export const readMainTargetBundle = (engine: MainTargetEngine, migrationsFolder: string): MainTargetBundle => {
  if (engine !== "sqlite" && engine !== "postgresql") return reject();
  if (
    !isAbsolute(migrationsFolder) ||
    !lstatSync(migrationsFolder).isDirectory() ||
    !lstatSync(join(migrationsFolder, "meta")).isDirectory()
  )
    return reject();
  const journal = engine === "sqlite" ? sqliteJournal : postgresqlJournal;
  const sqlPins = engine === "sqlite" ? sqliteSqlPins : postgresqlSqlPins;
  const snapshotPins = engine === "sqlite" ? sqliteSnapshotPins : postgresqlSnapshotPins;
  const terminal = engine === "sqlite" ? sqliteSnapshot : postgresqlSnapshot;
  const anchor = runtimeAnchors[engine];
  const journalPin =
    engine === "sqlite"
      ? "c78cac4ba328f43f5f54079d36da08148a9c7f229d76a9eaa7188fc1d54f5a98"
      : "d7c64c95aa3804928864ba9a844751b3cc5320c7a4b91c7e1b265938cfa9bf33";
  if (
    journal.entries.length !== sqlPins.length ||
    sqlPins.length !== snapshotPins.length ||
    sqlPins.length !== (engine === "sqlite" ? 51 : 19)
  )
    return reject();
  const journalText = readAsset(join(migrationsFolder, "meta/_journal.json"));
  if (hash(journalText) !== journalPin) return reject();
  const actual: unknown = JSON.parse(journalText);
  if (
    !isRecord(actual) ||
    !exactKeys(actual, ["version", "dialect", "entries"]) ||
    actual.version !== journal.version ||
    actual.dialect !== journal.dialect ||
    !Array.isArray(actual.entries) ||
    actual.entries.length !== journal.entries.length
  )
    return reject();
  const expectedRoot = new Set(["meta", ...journal.entries.map((entry) => `${entry.tag}.sql`)]);
  const expectedMeta = new Set([
    "_journal.json",
    ...journal.entries.map((entry) => `${String(entry.idx).padStart(4, "0")}_snapshot.json`),
  ]);
  for (const [path, expected] of [
    [migrationsFolder, expectedRoot],
    [join(migrationsFolder, "meta"), expectedMeta],
  ] satisfies [string, Set<string>][]) {
    const names = readdirSync(path);
    if (names.length !== expected.size || names.some((name) => !expected.has(name))) return reject();
  }
  const migrations: MigrationMeta[] = [];
  let previousId = "00000000-0000-0000-0000-000000000000";
  for (const [index, entry] of journal.entries.entries()) {
    const configured: unknown = actual.entries[index];
    if (
      !isRecord(configured) ||
      !exactKeys(configured, Object.keys(entry)) ||
      Object.entries(entry).some(([key, value]) => configured[key] !== value) ||
      entry.idx !== index ||
      !Number.isSafeInteger(entry.when)
    )
      return reject();
    const sql = readAsset(join(migrationsFolder, `${entry.tag}.sql`));
    if (hash(sql) !== sqlPins[index]) return reject();
    const snapshotText = readAsset(join(migrationsFolder, "meta", `${String(index).padStart(4, "0")}_snapshot.json`));
    if (hash(snapshotText) !== snapshotPins[index]) return reject();
    const snapshot: unknown = JSON.parse(snapshotText);
    if (
      !isRecord(snapshot) ||
      snapshot.version !== journal.version ||
      snapshot.dialect !== engine ||
      typeof snapshot.id !== "string" ||
      typeof snapshot.prevId !== "string" ||
      snapshot.prevId !== previousId
    )
      return reject();
    previousId = snapshot.id;
    if (
      index === anchor.migration.idx &&
      (entry.tag !== anchor.migration.tag ||
        entry.version !== anchor.migration.version ||
        entry.when !== anchor.migration.when ||
        entry.breakpoints !== anchor.migration.breakpoints ||
        sqlPins[index] !== anchor.migration.sqlSha256 ||
        snapshotPins[index] !== anchor.snapshot.sha256 ||
        snapshot.id !== anchor.snapshot.id ||
        snapshot.prevId !== anchor.snapshot.prevId)
    )
      return reject();
    if (index === journal.entries.length - 1 && (snapshot.id !== terminal.id || snapshot.prevId !== terminal.prevId))
      return reject();
    const migration: MigrationMeta = {
      sql: sql.split("--> statement-breakpoint"),
      folderMillis: entry.when,
      hash: sqlPins[index] ?? reject(),
      bps: entry.breakpoints,
    };
    freeze(migration);
    migrations.push(migration);
  }
  return Object.freeze({
    engine,
    identity: hash(
      JSON.stringify({
        engine,
        version: "homarr.main.physical.create.v2",
        physicalDefinition: engine === "sqlite" ? sqlitePhysicalDefinition : null,
        journal,
        journalPin,
        sqlPins,
        snapshotPins,
      }),
    ),
    migrationCount: migrations.length,
    runtimeAnchorIndex: anchor.migration.idx,
    migrations: Object.freeze(migrations),
  });
};

type Token = { kind: "keyword" | "identifier" | "literal" | "number" | "symbol"; value: string };
interface Column {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  default?: unknown;
}
interface ForeignKey {
  name: string;
  tableTo: string;
  columnsFrom: string[];
  columnsTo: string[];
  onUpdate: string;
  onDelete: string;
  match: "NONE";
  form: "table" | "inline";
}
interface Table {
  name: string;
  columns: Record<string, Column>;
  indexes: Record<string, { name: string; columns: string[]; isUnique: boolean }>;
  foreignKeys: Record<string, ForeignKey>;
  compositePrimaryKeys: Record<string, { name: string; columns: string[] }>;
  uniqueConstraints: Record<string, unknown>;
  checkConstraints: Record<string, { name: string; value: string }>;
}
type SnapshotTable = Omit<Table, "foreignKeys"> & {
  foreignKeys: Record<string, Omit<ForeignKey, "match" | "form">>;
};
const snapshotTables: SnapshotTable[] = Object.values(structuredClone(sqliteSnapshot.tables));
const tables: Table[] = snapshotTables.map((table) => ({
  ...table,
  foreignKeys: Object.fromEntries(
    Object.entries(table.foreignKeys).map(
      ([name, key]) =>
        [name, { ...key, match: "NONE", form: "table" } satisfies ForeignKey] satisfies [string, ForeignKey],
    ),
  ),
}));
const primaryOverrides: Record<string, string[]> = {
  boardUserPermission: ["board_id", "permission", "user_id"],
  integration_item: ["integration_id", "item_id"],
  integrationGroupPermissions: ["group_id", "integration_id", "permission"],
  integrationUserPermission: ["integration_id", "permission", "user_id"],
};
for (const table of tables) {
  const override = primaryOverrides[table.name];
  if (!override) continue;
  const primary = Object.values(table.compositePrimaryKeys);
  const key = primary[0];
  if (primary.length !== 1 || !key) reject();
  key.columns = [...override];
}
const integration = tables.find((table) => table.name === "integration") ?? reject();
if (Object.keys(integration.foreignKeys).length !== 1) reject();
const appReference = integration.foreignKeys.integration_app_id_app_id_fk;
const appColumn = integration.columns.app_id;
if (
  !appReference ||
  !appColumn ||
  appReference.tableTo !== "app" ||
  appReference.columnsFrom.length !== 1 ||
  appReference.columnsFrom[0] !== "app_id" ||
  appReference.columnsTo.length !== 1 ||
  appReference.columnsTo[0] !== "id" ||
  appColumn.type !== "text" ||
  appColumn.notNull ||
  appColumn.primaryKey ||
  Object.hasOwn(appColumn, "default")
)
  reject();
appReference.onUpdate = "no action";
appReference.onDelete = "no action";
appReference.form = "inline";
freeze(tables);
freeze(primaryOverrides);
const keywords = new Set(
  "CREATE TABLE INDEX UNIQUE ON PRIMARY KEY FOREIGN REFERENCES UPDATE DELETE NO ACTION CASCADE SET CONSTRAINT CHECK AND OR IS NOT NULL IN COLLATE BINARY TEXT INTEGER REAL SERIAL NUMERIC BLOB IF EXISTS DEFAULT TRUE FALSE ASC".split(
    " ",
  ),
);
const tokensFor = (sql: unknown): Token[] => {
  if (typeof sql !== "string" || Buffer.byteLength(sql) > 65536) return reject();
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < sql.length) {
    if (tokens.length >= 2048) return reject();
    const character = sql[offset];
    if (!character) return reject();
    if (/[ \t\r\n\f]/.test(character)) {
      offset++;
      continue;
    }
    if (character === '"' || character === "`" || character === "'") {
      offset++;
      let value = "";
      let closed = false;
      while (offset < sql.length) {
        const next = sql[offset++];
        if (next === character) {
          if (sql[offset] === character) {
            value += character;
            offset++;
          } else {
            closed = true;
            break;
          }
        } else {
          if (!next || next === "\0") return reject();
          value += next;
        }
      }
      if (!closed) return reject();
      tokens.push({ kind: character === "'" ? "literal" : "identifier", value });
      continue;
    }
    const word = /^[A-Za-z_][A-Za-z_0-9]*/.exec(sql.slice(offset))?.[0];
    if (word) {
      const upper = word.toUpperCase();
      if (keywords.has(upper)) tokens.push({ kind: "keyword", value: upper });
      else tokens.push({ kind: "identifier", value: word });
      offset += word.length;
      continue;
    }
    const number = /^\d+/.exec(sql.slice(offset))?.[0];
    if (number) {
      tokens.push({ kind: "number", value: number });
      offset += number.length;
      continue;
    }
    let symbol = character;
    if (sql.startsWith(">=", offset)) symbol = ">=";
    if (!["(", ")", ",", ".", ">", ">=", "=", ";"].includes(symbol)) return reject();
    tokens.push({ kind: "symbol", value: symbol });
    offset += symbol.length;
  }
  if (tokens.at(-1)?.value === ";") tokens.pop();
  return tokens;
};
const sameTokens = (actual: Token[], expected: Token[]) =>
  actual.length === expected.length &&
  actual.every((token, index) => token.kind === expected[index]?.kind && token.value === expected[index]?.value);
const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`;
const columnList = (names: string[]) => `(${names.map(quoted).join(",")})`;
const primaryColumns = (table: Table) => {
  const composites = Object.values(table.compositePrimaryKeys);
  const inline = Object.values(table.columns)
    .filter((column) => column.primaryKey)
    .map((column) => column.name);
  if (composites.length > 1 || (composites.length !== 0 && inline.length !== 0)) return reject();
  return composites[0]?.columns ?? inline;
};
const hasPrimaryIndex = (table: Table) => {
  const primary = primaryColumns(table);
  return (
    primary.length > 1 || (primary.length === 1 && table.columns[primary[0] ?? ""]?.type.toUpperCase() !== "INTEGER")
  );
};
const stripOuter = (tokens: Token[]): Token[] => {
  let result = tokens;
  while (result[0]?.value === "(" && result.at(-1)?.value === ")") {
    let depth = 0;
    let encloses = true;
    for (const [index, token] of result.entries()) {
      if (token.value === "(") depth++;
      if (token.value === ")") depth--;
      if (depth < 0) return reject();
      if (depth === 0 && index !== result.length - 1) encloses = false;
    }
    if (depth !== 0) return reject();
    if (!encloses) break;
    result = result.slice(1, -1);
  }
  return result;
};
const defaultTokens = (value: unknown): Token[] => {
  if (typeof value === "boolean") return [{ kind: "number", value: value ? "1" : "0" }];
  if (typeof value === "number" && Number.isSafeInteger(value)) return tokensFor(String(value));
  if (typeof value === "string") return stripOuter(tokensFor(value));
  return reject();
};
const matchesDefault = (actual: Token[], expected: unknown) => {
  let normalized = stripOuter(actual);
  if (typeof expected === "boolean" && normalized.length === 1) {
    if (normalized[0]?.kind === "keyword" && normalized[0]?.value === "TRUE")
      normalized = [{ kind: "number", value: "1" }];
    if (normalized[0]?.kind === "keyword" && normalized[0]?.value === "FALSE")
      normalized = [{ kind: "number", value: "0" }];
  }
  return sameTokens(normalized, defaultTokens(expected));
};
const tableClauses = (sql: unknown, name: string): Token[][] => {
  const tokens = tokensFor(sql);
  if (tokens[0]?.value !== "CREATE" || tokens[1]?.value !== "TABLE") return reject();
  let start = 2;
  if (tokens[start]?.value === "IF" && tokens[start + 1]?.value === "NOT" && tokens[start + 2]?.value === "EXISTS")
    start += 3;
  if (
    tokens[start]?.kind !== "identifier" ||
    tokens[start]?.value !== name ||
    tokens[start + 1]?.value !== "(" ||
    tokens.at(-1)?.value !== ")"
  )
    return reject();
  const result: Token[][] = [];
  let depth = 0;
  let clause: Token[] = [];
  for (const token of tokens.slice(start + 2, -1)) {
    if (token.value === "," && depth === 0) {
      if (clause.length === 0) return reject();
      result.push(clause);
      clause = [];
      continue;
    }
    if (token.value === "(") depth++;
    if (token.value === ")") depth--;
    if (depth < 0) return reject();
    clause.push(token);
  }
  if (depth !== 0 || clause.length === 0) return reject();
  result.push(clause);
  return result;
};
const assertColumnDdl = (tokens: Token[], column: Column, table: Table): string | undefined => {
  const type = tokensFor(column.type);
  if (!sameTokens(tokens.slice(1, 1 + type.length), type)) return reject();
  let offset = 1 + type.length;
  let primary = false;
  let notNull = false;
  let hasDefault = false;
  const inline = Object.values(table.foreignKeys).filter(
    (key) => key.form === "inline" && key.columnsFrom.length === 1 && key.columnsFrom[0] === column.name,
  );
  if (inline.length > 1) return reject();
  const reference = inline[0];
  let referenceSeen = false;
  while (offset < tokens.length) {
    if (tokens[offset]?.value === "PRIMARY" && tokens[offset + 1]?.value === "KEY" && !primary) {
      primary = true;
      offset += 2;
    } else if (tokens[offset]?.value === "NOT" && tokens[offset + 1]?.value === "NULL" && !notNull) {
      notNull = true;
      offset += 2;
    } else if (tokens[offset]?.value === "DEFAULT" && !hasDefault && Object.hasOwn(column, "default")) {
      hasDefault = true;
      offset++;
      const start = offset;
      let depth = 0;
      while (offset < tokens.length) {
        const token = tokens[offset];
        if (depth === 0 && ["NOT", "PRIMARY"].includes(token?.value ?? "")) break;
        if (token?.value === "(") depth++;
        if (token?.value === ")") depth--;
        if (depth < 0) return reject();
        offset++;
      }
      if (depth !== 0 || !matchesDefault(tokens.slice(start, offset), column.default)) return reject();
    } else if (tokens[offset]?.value === "REFERENCES" && reference && !referenceSeen) {
      if (
        !sameTokens(
          tokens.slice(offset),
          tokensFor(`REFERENCES ${quoted(reference.tableTo)}${columnList(reference.columnsTo)}`),
        )
      )
        return reject();
      referenceSeen = true;
      offset = tokens.length;
    } else return reject();
  }
  if (
    primary !== column.primaryKey ||
    notNull !== column.notNull ||
    hasDefault !== Object.hasOwn(column, "default") ||
    referenceSeen !== Boolean(reference)
  )
    return reject();
  if (reference) return reference.name;
  return undefined;
};
const foreignDdl = (key: Table["foreignKeys"][string]) =>
  tokensFor(
    `FOREIGN KEY ${columnList(key.columnsFrom)} REFERENCES ${quoted(key.tableTo)}${columnList(key.columnsTo)} ON UPDATE ${key.onUpdate} ON DELETE ${key.onDelete}`,
  );
const assertTableDdl = (sql: unknown, table: Table) => {
  if (Object.keys(table.uniqueConstraints).length !== 0) return reject();
  const columns = new Map(Object.values(table.columns).map((column) => [column.name, column]));
  const foreign = new Map(Object.values(table.foreignKeys).map((key) => [key.name, key]));
  const checks = new Map(
    Object.values(table.checkConstraints).map((check) => [check.name, tokensFor(`CHECK(${check.value})`)]),
  );
  const primary = Object.values(table.compositePrimaryKeys)[0];
  let primarySeen = false;
  for (let clause of tableClauses(sql, table.name)) {
    const first = clause[0];
    const column = first?.kind === "identifier" ? columns.get(first.value) : undefined;
    if (column) {
      const reference = assertColumnDdl(clause, column, table);
      if (reference !== undefined && !foreign.delete(reference)) return reject();
      columns.delete(column.name);
      continue;
    }
    let constraint: string | undefined;
    if (clause[0]?.value === "CONSTRAINT") {
      if (clause[1]?.kind !== "identifier") return reject();
      constraint = clause[1]?.value;
      clause = clause.slice(2);
    }
    if (
      clause[0]?.value === "PRIMARY" &&
      primary &&
      !primarySeen &&
      constraint === undefined &&
      sameTokens(clause, tokensFor(`PRIMARY KEY${columnList(primaryColumns(table))}`))
    ) {
      primarySeen = true;
      continue;
    }
    if (clause[0]?.value === "FOREIGN" && constraint === undefined) {
      const match = [...foreign].find(([, key]) => key.form === "table" && sameTokens(clause, foreignDdl(key)));
      if (!match) return reject();
      foreign.delete(match[0]);
      continue;
    }
    if (clause[0]?.value === "CHECK" && constraint !== undefined) {
      const normalized = clause.map((token, index) => {
        if (
          (table.name === "apiKey" || table.name === "session") &&
          token.kind === "identifier" &&
          token.value === `__new_${table.name}` &&
          clause[index + 1]?.value === "."
        )
          return { ...token, value: table.name };
        return token;
      });
      const expected = checks.get(constraint);
      if (!expected || !sameTokens(normalized, expected)) return reject();
      checks.delete(constraint);
      continue;
    }
    return reject();
  }
  if (columns.size !== 0 || foreign.size !== 0 || checks.size !== 0 || primarySeen !== Boolean(primary))
    return reject();
};
const assertColumns = (reader: CopiedCatalogReader, table: Table): Map<string, number> => {
  const expected = new Map(Object.values(table.columns).map((column) => [column.name, column]));
  const primary = primaryColumns(table);
  const rows = reader.all(
    'SELECT cid, name, type, "notnull", dflt_value, pk, hidden FROM pragma_table_xinfo(?, ?) ORDER BY cid LIMIT ?',
    [table.name, "main", expected.size + 1],
  );
  if (rows.length !== expected.size) return reject();
  const cids = new Map<string, number>();
  for (const [index, row] of rows.entries()) {
    if (typeof row.name !== "string" || row.cid !== index) return reject();
    const column = expected.get(row.name);
    if (
      !column ||
      typeof row.type !== "string" ||
      row.type.toUpperCase() !== tokensFor(column.type)[0]?.value.toUpperCase() ||
      row.notnull !== Number(column.notNull) ||
      row.pk !== primary.indexOf(row.name) + 1 ||
      row.hidden !== 0
    )
      return reject();
    if (Object.hasOwn(column, "default")) {
      if (typeof row.dflt_value !== "string" || !matchesDefault(tokensFor(row.dflt_value), column.default))
        return reject();
    } else if (row.dflt_value !== null) return reject();
    cids.set(row.name, index);
    expected.delete(row.name);
  }
  return cids;
};
const assertForeignKeys = (reader: CopiedCatalogReader, table: Table) => {
  const expected = Object.values(table.foreignKeys);
  const count = expected.reduce((total, key) => total + key.columnsFrom.length, 0);
  const rows = reader.all(
    'SELECT id, seq, "table", "from", "to", on_update, on_delete, "match" FROM pragma_foreign_key_list(?, ?) ORDER BY id, seq LIMIT ?',
    [table.name, "main", count + 1],
  );
  if (rows.length !== count) return reject();
  const groups = new Map<number, CopiedSqlRow[]>();
  for (const row of rows) {
    if (typeof row.id !== "number" || !Number.isSafeInteger(row.id) || row.id < 0 || row.id >= expected.length)
      return reject();
    const group = groups.get(row.id) ?? [];
    if (row.seq !== group.length) return reject();
    group.push(row);
    groups.set(row.id, group);
  }
  const remaining = [...expected];
  for (const group of groups.values()) {
    const index = remaining.findIndex(
      (key) =>
        group.length === key.columnsFrom.length &&
        group.every(
          (row, offset) =>
            row.table === key.tableTo &&
            row.from === key.columnsFrom[offset] &&
            row.to === key.columnsTo[offset] &&
            row.on_update === key.onUpdate.toUpperCase() &&
            row.on_delete === key.onDelete.toUpperCase() &&
            row.match === key.match,
        ),
    );
    if (index === -1) return reject();
    remaining.splice(index, 1);
  }
  if (remaining.length !== 0) return reject();
};
const assertIndexes = (reader: CopiedCatalogReader, table: Table, cids: Map<string, number>) => {
  const expected = new Map(
    Object.values(table.indexes).map((index) => [
      index.name,
      { columns: index.columns, unique: Number(index.isUnique), origin: "c" },
    ]),
  );
  if (hasPrimaryIndex(table))
    expected.set(`sqlite_autoindex_${table.name}_1`, { columns: primaryColumns(table), unique: 1, origin: "pk" });
  const rows = reader.all('SELECT name, "unique", origin, partial FROM pragma_index_list(?, ?) ORDER BY name LIMIT ?', [
    table.name,
    "main",
    expected.size + 1,
  ]);
  if (rows.length !== expected.size) return reject();
  for (const row of rows) {
    if (typeof row.name !== "string") return reject();
    const target = expected.get(row.name);
    if (!target || row.unique !== target.unique || row.origin !== target.origin || row.partial !== 0) return reject();
    const terms = reader.all(
      'SELECT seqno, cid, name, "desc", coll, "key" FROM pragma_index_xinfo(?, ?) ORDER BY seqno LIMIT ?',
      [row.name, "main", target.columns.length + 2],
    );
    if (terms.length !== target.columns.length + 1) return reject();
    for (const [index, term] of terms.entries()) {
      if (term.seqno !== index || term.desc !== 0 || term.coll !== "BINARY") return reject();
      if (index === target.columns.length) {
        if (term.cid !== -1 || term.name !== null || term.key !== 0) return reject();
      } else {
        const name = target.columns[index];
        if (!name || term.key !== 1 || term.name !== name || term.cid !== cids.get(name)) return reject();
      }
    }
    expected.delete(row.name);
  }
  if (expected.size !== 0) return reject();
};
const ledger: Table = {
  name: "__drizzle_migrations",
  columns: {
    id: { name: "id", type: "SERIAL", primaryKey: true, notNull: false },
    hash: { name: "hash", type: "text", primaryKey: false, notNull: true },
    created_at: { name: "created_at", type: "numeric", primaryKey: false, notNull: false },
  },
  indexes: {},
  foreignKeys: {},
  compositePrimaryKeys: {},
  uniqueConstraints: {},
  checkConstraints: {},
};
const sqlitePhysicalDefinition = {
  tables,
  ledger,
  representation: {
    primaryKeys: "unnamed-inline-or-table",
    foreignKeys: "unnamed-table-or-sole-owning-inline-reference",
    inlineActions: "omitted-no-action",
    defaultBooleans: ["TRUE", "FALSE", "1", "0"],
    defaultParentheses: "outer-expression-only",
    checkQualifierRewrites: { apiKey: "__new_apiKey", session: "__new_session" },
    indexCollation: "BINARY",
    indexDirection: "ascending",
    indexAuxiliary: "single-rowid",
    sqlByteLimit: 65536,
    tokenLimit: 2048,
    assetByteLimit: 1024 * 1024,
    statistics: { sqlite_stat1: ["tbl", "idx", "stat"], sqlite_stat4: ["tbl", "idx", "neq", "nlt", "ndlt", "sample"] },
  },
};
freeze(sqlitePhysicalDefinition);
const assertTable = (reader: CopiedCatalogReader, table: Table, sql: unknown) => {
  assertTableDdl(sql, table);
  const cids = assertColumns(reader, table);
  assertForeignKeys(reader, table);
  assertIndexes(reader, table, cids);
};
const assertTime = (value: unknown, expected: number) => {
  if (typeof value === "number" && Number.isSafeInteger(value) && value === expected) return;
  if (typeof value === "bigint" && value === BigInt(expected)) return;
  if (typeof value === "string" && value.length <= 16 && /^(0|[1-9]\d*)$/.test(value) && value === String(expected))
    return;
  return reject();
};
const assertStatistics = (reader: CopiedCatalogReader, object: CopiedSqlRow) => {
  let columns: string[];
  if (object.name === "sqlite_stat1") columns = ["tbl", "idx", "stat"];
  else if (object.name === "sqlite_stat4") columns = ["tbl", "idx", "neq", "nlt", "ndlt", "sample"];
  else return reject();
  if (
    object.type !== "table" ||
    object.tbl_name !== object.name ||
    object.sql !== `CREATE TABLE ${object.name}(${columns.join(",")})`
  )
    return reject();
  const rows = reader.all(
    'SELECT cid, name, type, "notnull", dflt_value, pk, hidden FROM pragma_table_xinfo(?, ?) ORDER BY cid LIMIT ?',
    [object.name, "main", columns.length + 1],
  );
  if (
    rows.length !== columns.length ||
    rows.some(
      (row, index) =>
        row.cid !== index ||
        row.name !== columns[index] ||
        row.type !== "" ||
        row.notnull !== 0 ||
        row.pk !== 0 ||
        row.hidden !== 0 ||
        row.dflt_value !== null,
    )
  )
    return reject();
  if (
    reader.all("SELECT name FROM pragma_index_list(?, ?) LIMIT 1", [object.name, "main"]).length !== 0 ||
    reader.all("SELECT id FROM pragma_foreign_key_list(?, ?) LIMIT 1", [object.name, "main"]).length !== 0
  )
    return reject();
};

export const assertSqliteMainTarget = (reader: CopiedCatalogReader, migrationsFolder: string): void => {
  const bundle = readMainTargetBundle("sqlite", migrationsFolder);
  const schemas = reader.all("SELECT seq, name FROM pragma_database_list LIMIT 3");
  if (
    schemas.length === 0 ||
    schemas.length > 2 ||
    !schemas.some((row) => row.name === "main") ||
    schemas.some((row) => (row.name !== "main" || row.seq !== 0) && (row.name !== "temp" || row.seq !== 1)) ||
    reader.all("SELECT name FROM sqlite_temp_master LIMIT 1").length !== 0
  )
    return reject();
  const ledgerObjects = reader.all("SELECT type, name, tbl_name, sql FROM main.sqlite_master WHERE name = ? LIMIT 2", [
    ledger.name,
  ]);
  const ledgerObject = ledgerObjects[0];
  if (
    ledgerObjects.length !== 1 ||
    !ledgerObject ||
    ledgerObject.type !== "table" ||
    ledgerObject.tbl_name !== ledger.name
  )
    return reject();
  const ledgerTokens = tokensFor(ledgerObject.sql);
  if (ledgerTokens[2]?.value === "IF" && ledgerTokens[3]?.value === "NOT" && ledgerTokens[4]?.value === "EXISTS")
    ledgerTokens.splice(2, 3);
  if (
    !sameTokens(
      ledgerTokens,
      tokensFor('CREATE TABLE "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'),
    )
  )
    return reject();
  assertTable(reader, ledger, ledgerObject.sql);
  const history = reader.all(
    "SELECT hash, created_at FROM main.__drizzle_migrations NOT INDEXED ORDER BY created_at LIMIT ?",
    [bundle.migrationCount + 1],
  );
  if (history.length !== bundle.migrationCount) return reject();
  for (const [index, row] of history.entries()) {
    const expected = bundle.migrations[index];
    if (!expected || row.hash !== expected.hash) return reject();
    assertTime(row.created_at, expected.folderMillis);
  }
  const expectedObjects = new Map<string, { kind: "table" | "index"; table: Table; sql: Token[] | null }>();
  for (const table of [...tables, ledger]) {
    expectedObjects.set(table.name, { kind: "table", table, sql: null });
    for (const index of Object.values(table.indexes))
      expectedObjects.set(index.name, {
        kind: "index",
        table,
        sql: tokensFor(
          `CREATE ${index.isUnique ? "UNIQUE " : ""}INDEX ${quoted(index.name)} ON ${quoted(table.name)} ${columnList(index.columns)}`,
        ),
      });
    if (hasPrimaryIndex(table))
      expectedObjects.set(`sqlite_autoindex_${table.name}_1`, { kind: "index", table, sql: null });
  }
  const objects = reader.all("SELECT type, name, tbl_name, sql FROM main.sqlite_master ORDER BY name LIMIT ?", [
    expectedObjects.size + 3,
  ]);
  if (objects.length > expectedObjects.size + 2) return reject();
  const anchorDdl = new Map<string, Token[]>();
  for (const sql of bundle.migrations[bundle.runtimeAnchorIndex]?.sql ?? []) {
    const tokens = tokensFor(sql);
    if (tokens[0]?.value === "CREATE" && tokens[2]?.kind === "identifier") anchorDdl.set(tokens[2].value, tokens);
  }
  for (const object of objects) {
    if (typeof object.name !== "string") return reject();
    if (object.name === "sqlite_stat1" || object.name === "sqlite_stat4") {
      assertStatistics(reader, object);
      continue;
    }
    const expected = expectedObjects.get(object.name);
    if (!expected || object.type !== expected.kind || object.tbl_name !== expected.table.name) return reject();
    if (expected.kind === "table") assertTable(reader, expected.table, object.sql);
    else if (expected.sql === null) {
      if (object.sql !== null) return reject();
    } else if (!sameTokens(tokensFor(object.sql), expected.sql)) return reject();
    const original = anchorDdl.get(object.name);
    if (original && !sameTokens(tokensFor(object.sql), original)) return reject();
    expectedObjects.delete(object.name);
  }
  if (expectedObjects.size !== 0 || anchorDdl.size !== 5) return reject();
  const meta = reader.all(
    "SELECT id, typeof(epoch) AS epoch_type, epoch IS NULL AS epoch_is_null FROM main.homarr_runtime_meta ORDER BY id LIMIT 3",
  );
  if (
    meta.length !== 2 ||
    meta[0]?.id !== 1 ||
    meta[0]?.epoch_type !== "text" ||
    meta[0]?.epoch_is_null !== 0 ||
    meta[1]?.id !== 2 ||
    meta[1]?.epoch_type !== "null" ||
    meta[1]?.epoch_is_null !== 1
  )
    return reject();
};
