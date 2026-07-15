const APP_ID = 'N69WSPZTID';
const API_KEY = 'b2b00f4ed8ca3dc87b5d211c55121416';
const DOCSEARCH_INDEX = 'Docusaurus';
const MARKDOWN_INDEX = 'markdown';
const MIN_DOCSEARCH_HITS = 100;
const MIN_MARKDOWN_HITS = 10;

const DOCSEARCH_FACETS = [
  'docusaurus_tag',
  'language',
  'lang',
  'version',
  'type',
];

const SEARCH_CASES = [
  { term: 'docker', minHits: 1 },
  { term: 'coolify', minHits: 1 },
  { term: 'jellyseerr', minHits: 1 },
  { term: 'keyboard shortcuts', minHits: 1 },
  { term: 'version 0.12', minHits: 1 },
];

const STALE_URL_PATTERN = /\/docs\/(next|\d+(?:\.\d+)+)\//;

async function algoliaQuery(index, body) {
  const response = await fetch(
    `https://${APP_ID}-dsn.algolia.net/1/indexes/${index}/query`,
    {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': APP_ID,
        'X-Algolia-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Algolia query on "${index}" failed: HTTP ${response.status}`);
  }

  return response.json();
}

function reportLine(ok, message) {
  const prefix = ok ? 'OK' : 'FAIL';
  console.log(`${prefix}: ${message}`);
  return ok;
}

async function resolveDocsearchIndex() {
  const candidates = [DOCSEARCH_INDEX, `${DOCSEARCH_INDEX}.tmp`];

  for (const index of candidates) {
    const result = await algoliaQuery(index, { query: '', hitsPerPage: 0 });
    const hitCount = result.nbHits ?? 0;
    if (hitCount >= MIN_DOCSEARCH_HITS) {
      return { index, hitCount };
    }
  }

  const fallback = await algoliaQuery(DOCSEARCH_INDEX, { query: '', hitsPerPage: 0 });
  return { index: DOCSEARCH_INDEX, hitCount: fallback.nbHits ?? 0 };
}

async function resolveMarkdownIndex() {
  const candidates = [MARKDOWN_INDEX, `${MARKDOWN_INDEX}.tmp`];

  for (const index of candidates) {
    const result = await algoliaQuery(index, { query: '', hitsPerPage: 0 });
    const hitCount = result.nbHits ?? 0;
    if (hitCount >= MIN_MARKDOWN_HITS) {
      return { index, hitCount };
    }
  }

  const fallback = await algoliaQuery(MARKDOWN_INDEX, { query: '', hitsPerPage: 0 });
  return { index: MARKDOWN_INDEX, hitCount: fallback.nbHits ?? 0 };
}

async function verifyDocsearchIndex(index, hitCount) {
  let ok = reportLine(
    hitCount >= MIN_DOCSEARCH_HITS,
    `index "${index}" has ${hitCount} records (need >= ${MIN_DOCSEARCH_HITS})`,
  );

  const sample = await algoliaQuery(index, {
    query: 'docker',
    hitsPerPage: 1,
    attributesToRetrieve: DOCSEARCH_FACETS,
  });

  const record = sample.hits?.[0] ?? {};
  const recordFields = ['docusaurus_tag', 'language', 'lang', 'version', 'type'];
  for (const field of recordFields) {
    const present = record[field] !== undefined && record[field] !== null;
    ok = reportLine(present, `records include "${field}"`) && ok;
  }

  for (const searchCase of SEARCH_CASES) {
    const result = await algoliaQuery(index, {
      query: searchCase.term,
      hitsPerPage: 5,
      attributesToRetrieve: ['url'],
    });

    const caseHits = result.nbHits ?? 0;
    ok =
      reportLine(
        caseHits >= searchCase.minHits,
        `"${searchCase.term}" returns ${caseHits} hits (need >= ${searchCase.minHits})`,
      ) && ok;

    const staleUrls = (result.hits ?? [])
      .map((hit) => hit.url)
      .filter((url) => STALE_URL_PATTERN.test(url));

    ok =
      reportLine(
        staleUrls.length === 0,
        `"${searchCase.term}" has no stale versioned URLs (${staleUrls.length} stale)`,
      ) && ok;
  }

  return ok;
}

async function verifyMarkdownIndex(index, hitCount) {
  let ok = reportLine(
    hitCount >= MIN_MARKDOWN_HITS,
    `markdown index "${index}" has ${hitCount} records (need >= ${MIN_MARKDOWN_HITS})`,
  );

  const coolify = await algoliaQuery(index, {
    query: 'coolify',
    hitsPerPage: 3,
    attributesToRetrieve: ['url', 'title', 'heading', 'text'],
  });

  ok =
    reportLine(
      (coolify.nbHits ?? 0) >= 1,
      `markdown index "${index}" returns coolify (${coolify.nbHits ?? 0} hits)`,
    ) && ok;

  const sample = coolify.hits?.[0];
  ok =
    reportLine(
      Boolean(sample?.text?.length),
      `markdown records include chunked text content`,
    ) && ok;

  return ok;
}

async function main() {
  console.log('Verifying Algolia DocSearch + markdown indices...\n');

  const docsearch = await resolveDocsearchIndex();
  console.log(`Using DocSearch index: ${docsearch.index}\n`);
  const docsearchOk = await verifyDocsearchIndex(
    docsearch.index,
    docsearch.hitCount,
  );

  console.log('');
  const markdown = await resolveMarkdownIndex();
  console.log(`Using markdown index: ${markdown.index}\n`);
  const markdownOk = await verifyMarkdownIndex(
    markdown.index,
    markdown.hitCount,
  );

  const allOk = docsearchOk && markdownOk;
  console.log('');
  console.log(
    allOk
      ? 'All checks passed.'
      : 'Some checks failed — ensure the crawler config in docsearch.config.js is applied and a full recrawl has finished.',
  );
  process.exit(allOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
