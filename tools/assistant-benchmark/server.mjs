import { createServer } from "node:http";

const HOST = "127.0.0.1";
const PORT = 18094;
const SONARR_API_KEY = "benchmark-sonarr-key";
const MEALIE_TOKEN = "benchmark-mealie-token";
const DEFAULT_BENCHMARK_DATE = "2026-09-24";
const BENCHMARK_DATE = process.env.BENCHMARK_DATE ?? DEFAULT_BENCHMARK_DATE;

if (
  !/^\d{4}-\d{2}-\d{2}$/.test(BENCHMARK_DATE) ||
  Number.isNaN(Date.parse(`${BENCHMARK_DATE}T00:00:00Z`)) ||
  new Date(`${BENCHMARK_DATE}T00:00:00Z`).toISOString().slice(0, 10) !== BENCHMARK_DATE
) {
  throw new Error("BENCHMARK_DATE must be a valid YYYY-MM-DD date");
}

const routes = new Set([
  "/health",
  "/sonarr/api/v3/series",
  "/sonarr/api/v3/queue",
  "/mealie/api/households/mealplans/today",
  "/mealie/api/households/mealplans",
  "/openlibrary/search.json",
  "/openmeteo/v1/search",
  "/openmeteo/v1/forecast",
]);

const requestCounts = new Map();

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function recordRequest(method, pathname) {
  const key = `${method} ${pathname}`;
  requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Response fields match Homarr's validated Sonarr schemas in
// packages/integrations/src/media-organizer/sonarr/sonarr-integration.ts.
const sonarrSeries = [
  {
    id: 101,
    title: "Severance",
    titleSlug: "severance",
    year: 2022,
    monitored: true,
    statistics: { totalEpisodeCount: 19, episodeFileCount: 18, sizeOnDisk: 18400000000 },
  },
  {
    id: 102,
    title: "The Expanse",
    titleSlug: "the-expanse",
    year: 2015,
    monitored: true,
    statistics: { totalEpisodeCount: 62, episodeFileCount: 62, sizeOnDisk: 58200000000 },
  },
  {
    id: 103,
    title: "Synthetic Unmonitored Series",
    titleSlug: "synthetic-unmonitored-series",
    year: 2024,
    monitored: false,
    statistics: { totalEpisodeCount: 8, episodeFileCount: 3, sizeOnDisk: 2900000000 },
  },
];

const sonarrQueue = {
  page: 1,
  pageSize: 10,
  totalRecords: 2,
  records: [
    {
      id: 501,
      title: "Severance - S02E05 - Trojan's Horse",
      status: "downloading",
      timeleft: "00:18:42",
      size: 4200000000,
      sizeleft: 1260000000,
      series: { title: "Severance", titleSlug: "severance", images: [] },
      episode: { title: "Trojan's Horse", seasonNumber: 2, episodeNumber: 5 },
    },
    {
      id: 502,
      title: "The Expanse - S04E01 - New Terra",
      status: "queued",
      timeleft: "01:06:10",
      size: 2800000000,
      sizeleft: 2800000000,
      series: { title: "The Expanse", titleSlug: "the-expanse", images: [] },
      episode: { title: "New Terra", seasonNumber: 4, episodeNumber: 1 },
    },
  ],
};

// These synthetic records follow Mealie v2 PlanEntry and PlanEntryPagination.
// Reference: https://mealie.io/documentation/community-guide/home-assistant/
const mealieIds = {
  household: "20000000-0000-4000-8000-000000000001",
  group: "20000000-0000-4000-8000-000000000002",
  user: "20000000-0000-4000-8000-000000000003",
};

function mealieRecipe({ id, name, slug, description, totalTime, prepTime, cookTime, servings }) {
  return {
    id,
    userId: mealieIds.user,
    householdId: mealieIds.household,
    groupId: mealieIds.group,
    name,
    slug,
    image: null,
    recipeServings: servings,
    recipeYieldQuantity: servings,
    recipeYield: "servings",
    totalTime,
    prepTime,
    cookTime,
    performTime: cookTime,
    description,
    recipeCategory: [],
    tags: [],
    tools: [],
    rating: null,
    orgURL: null,
    dateAdded: BENCHMARK_DATE,
  };
}

const mealPlans = [
  {
    id: 1701,
    date: BENCHMARK_DATE,
    entryType: "lunch",
    title: "",
    text: "",
    recipeId: "10000000-0000-4000-8000-000000000001",
    groupId: mealieIds.group,
    userId: mealieIds.user,
    householdId: mealieIds.household,
    recipe: mealieRecipe({
      id: "10000000-0000-4000-8000-000000000001",
      name: "Sesame Ginger Tofu Rice Bowl",
      slug: "sesame-ginger-tofu-rice-bowl",
      description: "Crispy tofu, steamed rice, and quick-pickled vegetables with sesame ginger sauce.",
      totalTime: "PT25M",
      prepTime: "PT15M",
      cookTime: "PT10M",
      servings: 2,
    }),
  },
  {
    id: 1702,
    date: BENCHMARK_DATE,
    entryType: "dinner",
    title: "",
    text: "",
    recipeId: "10000000-0000-4000-8000-000000000002",
    groupId: mealieIds.group,
    userId: mealieIds.user,
    householdId: mealieIds.household,
    recipe: mealieRecipe({
      id: "10000000-0000-4000-8000-000000000002",
      name: "Roasted Tomato and Red Lentil Soup",
      slug: "roasted-tomato-red-lentil-soup",
      description: "A hearty red lentil soup with roasted tomatoes, cumin, and lemon.",
      totalTime: "PT45M",
      prepTime: "PT10M",
      cookTime: "PT35M",
      servings: 4,
    }),
  },
  {
    id: 1703,
    date: addDays(BENCHMARK_DATE, 1),
    entryType: "lunch",
    title: "",
    text: "",
    recipeId: "10000000-0000-4000-8000-000000000003",
    groupId: mealieIds.group,
    userId: mealieIds.user,
    householdId: mealieIds.household,
    recipe: mealieRecipe({
      id: "10000000-0000-4000-8000-000000000003",
      name: "Lemon Herb Chickpea Salad",
      slug: "lemon-herb-chickpea-salad",
      description: "Chickpeas, cucumber, parsley, and lemon vinaigrette served over greens.",
      totalTime: "PT15M",
      prepTime: "PT15M",
      cookTime: "PT0M",
      servings: 2,
    }),
  },
];

// Search documents use the official Open Library Search API field names.
// Reference: https://openlibrary.org/dev/docs/api/search
const books = [
  {
    key: "/works/OL9999001W",
    title: "Dune",
    author_name: ["Frank Herbert"],
    first_publish_year: 1965,
    edition_count: 40,
    cover_i: 9999001,
    author_key: ["OL9999001A"],
  },
  {
    key: "/works/OL9999002W",
    title: "Dune Messiah",
    author_name: ["Frank Herbert"],
    first_publish_year: 1969,
    edition_count: 25,
    cover_i: 9999002,
    author_key: ["OL9999001A"],
  },
  {
    key: "/works/OL9999003W",
    title: "The Hobbit",
    author_name: ["J. R. R. Tolkien"],
    first_publish_year: 1937,
    edition_count: 180,
    cover_i: 9999003,
    author_key: ["OL9999003A"],
  },
];

const geocodingLocations = [
  {
    id: 2950159,
    name: "Berlin",
    latitude: 52.52437,
    longitude: 13.41053,
    elevation: 74,
    feature_code: "PPLC",
    country_code: "DE",
    admin1_id: 2950157,
    admin2_id: 0,
    admin3_id: 6547383,
    admin4_id: 6547539,
    timezone: "Europe/Berlin",
    population: 3426354,
    postcodes: ["10967", "13347"],
    country_id: 2921044,
    country: "Germany",
    admin1: "Berlin",
    admin2: "",
    admin3: "Berlin, Stadt",
    admin4: "Berlin",
  },
  {
    id: 2988507,
    name: "Paris",
    latitude: 48.85341,
    longitude: 2.3488,
    elevation: 42,
    feature_code: "PPLC",
    country_code: "FR",
    admin1_id: 3012874,
    admin2_id: 0,
    timezone: "Europe/Paris",
    population: 2138551,
    postcodes: ["75001", "75002"],
    country_id: 3017382,
    country: "France",
    admin1: "Île-de-France",
    admin2: "",
  },
];

// Open-Meteo uses separate forecast and geocoding hosts in production; both
// official /v1 paths are mounted below /openmeteo for this single-origin fixture.
// References: https://open-meteo.com/en/docs and https://open-meteo.com/en/docs/geocoding-api
const currentUnit = {
  temperature_2m: "°C",
  apparent_temperature: "°C",
  relative_humidity_2m: "%",
  precipitation: "mm",
  is_day: "",
  weather_code: "wmo code",
};

const dailyUnit = {
  temperature_2m_max: "°C",
  temperature_2m_min: "°C",
  apparent_temperature_max: "°C",
  precipitation_probability_max: "%",
  precipitation_sum: "mm",
  rain_sum: "mm",
  precipitation_hours: "h",
  weather_code: "wmo code",
  sunrise: "iso8601",
  sunset: "iso8601",
};

function requestedVariables(url, name, fallback) {
  const values = url.searchParams.getAll(name).flatMap((value) => value.split(","));
  return values.length > 0 ? values.filter(Boolean) : fallback;
}

function celsiusToRequestedUnit(value, unit) {
  if (unit === "fahrenheit") return Math.round((value * 9) / 5 + 32);
  return Math.round(value * 10) / 10;
}

function timezoneOffsetSeconds(date, timezone) {
  const utcDate = new Date(`${date}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcDate);
  const fields = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  const localAsUtc = Date.UTC(
    fields.year,
    Number(fields.month) - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
  );
  return Math.round((localAsUtc - utcDate.getTime()) / 1000);
}

function timezoneAbbreviation(date, timezone) {
  return (
    new Intl.DateTimeFormat("en", { timeZone: timezone, timeZoneName: "short" })
      .formatToParts(new Date(`${date}T12:00:00.000Z`))
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT"
  );
}

function forecastResponse(url) {
  const latitude = Number(url.searchParams.get("latitude"));
  const longitude = Number(url.searchParams.get("longitude"));
  if (
    !url.searchParams.get("latitude")?.trim() ||
    !url.searchParams.get("longitude")?.trim() ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { status: 400, body: { error: true, reason: "latitude and longitude are required" } };
  }

  const temperatureUnit = url.searchParams.get("temperature_unit") ?? "celsius";
  if (!new Set(["celsius", "fahrenheit"]).has(temperatureUnit)) {
    return { status: 400, body: { error: true, reason: "temperature_unit must be celsius or fahrenheit" } };
  }

  const forecastDays = Number(url.searchParams.get("forecast_days") ?? 7);
  if (!Number.isInteger(forecastDays) || forecastDays < 1 || forecastDays > 16) {
    return { status: 400, body: { error: true, reason: "forecast_days must be between 1 and 16" } };
  }

  const timezone = url.searchParams.get("timezone") ?? "GMT";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    return { status: 400, body: { error: true, reason: "Unsupported fixture timezone" } };
  }
  const currentVariables = requestedVariables(url, "current", ["temperature_2m", "apparent_temperature"]);
  const dailyVariables = requestedVariables(url, "daily", ["precipitation_probability_max"]);
  if (
    currentVariables.some((name) => !Object.hasOwn(currentUnit, name)) ||
    dailyVariables.some((name) => !Object.hasOwn(dailyUnit, name))
  ) {
    return { status: 400, body: { error: true, reason: "Unsupported fixture weather variable" } };
  }
  const dateAtLocation = (day) => addDays(BENCHMARK_DATE, day);
  const locationBias = Math.round((Math.abs(latitude) * 0.73 + Math.abs(longitude) * 0.41) % 9) - 4;
  const baseCelsius = 17 + locationBias;
  const unitSuffix = temperatureUnit === "fahrenheit" ? "°F" : "°C";
  const precipitationUnit = url.searchParams.get("precipitation_unit") === "inch" ? "inch" : "mm";
  const precipitationMultiplier = precipitationUnit === "inch" ? 1 / 25.4 : 1;
  const precipitationLabel = precipitationUnit === "inch" ? "inch" : "mm";
  const offsetSeconds = timezoneOffsetSeconds(BENCHMARK_DATE, timezone);

  const currentFieldValues = {
    temperature_2m: celsiusToRequestedUnit(baseCelsius, temperatureUnit),
    apparent_temperature: celsiusToRequestedUnit(baseCelsius + 1.4, temperatureUnit),
    relative_humidity_2m: 61,
    precipitation: Number((0.2 * precipitationMultiplier).toFixed(2)),
    is_day: 1,
    weather_code: 2,
  };
  const current = { time: `${BENCHMARK_DATE}T12:00`, interval: 900 };
  const currentUnits = { time: "iso8601", interval: "seconds" };
  for (const variable of currentVariables) {
    if (Object.hasOwn(currentFieldValues, variable)) {
      current[variable] = currentFieldValues[variable];
      currentUnits[variable] =
        variable === "temperature_2m" || variable === "apparent_temperature"
          ? unitSuffix
          : variable === "precipitation"
            ? precipitationLabel
            : currentUnit[variable];
    }
  }

  const dailyValues = {
    temperature_2m_max: (day) => celsiusToRequestedUnit(baseCelsius + 4 + day * 0.4, temperatureUnit),
    temperature_2m_min: (day) => celsiusToRequestedUnit(baseCelsius - 3 + day * 0.2, temperatureUnit),
    apparent_temperature_max: (day) => celsiusToRequestedUnit(baseCelsius + 3 + day * 0.5, temperatureUnit),
    precipitation_probability_max: (day) => Math.round((Math.abs(latitude * 3 + longitude * 5 + day * 17) % 86) + 5),
    precipitation_sum: (day) => Number((((day * 1.7 + locationBias + 8) % 9) * precipitationMultiplier).toFixed(2)),
    rain_sum: (day) => Number((((day * 1.2 + locationBias + 5) % 7) * precipitationMultiplier).toFixed(2)),
    precipitation_hours: (day) => (day * 2 + 1 + locationBias + 10) % 12,
    weather_code: (day) => [2, 3, 61, 1, 80, 2, 3][day % 7],
    sunrise: (day) => `${dateAtLocation(day)}T06:${String((12 + day * 2) % 60).padStart(2, "0")}`,
    sunset: (day) => `${dateAtLocation(day)}T19:${String((8 - day + 60) % 60).padStart(2, "0")}`,
  };
  const daily = { time: Array.from({ length: forecastDays }, (_, day) => dateAtLocation(day)) };
  const dailyUnits = { time: "iso8601" };
  for (const variable of dailyVariables) {
    if (Object.hasOwn(dailyValues, variable)) {
      daily[variable] = Array.from({ length: forecastDays }, (_, day) => dailyValues[variable](day));
      dailyUnits[variable] =
        variable.startsWith("temperature_") || variable === "apparent_temperature_max"
          ? unitSuffix
          : variable === "precipitation_sum" || variable === "rain_sum"
            ? precipitationLabel
            : dailyUnit[variable];
    }
  }

  const body = {
    latitude,
    longitude,
    generationtime_ms: 0.01,
    utc_offset_seconds: offsetSeconds,
    timezone,
    timezone_abbreviation: timezoneAbbreviation(BENCHMARK_DATE, timezone),
    elevation: 34,
    current,
    current_units: currentUnits,
    daily,
    daily_units: dailyUnits,
  };
  return { status: 200, body };
}

function openLibraryResponse(url) {
  const titleFilter = url.searchParams.get("title");
  const query = (url.searchParams.get("q") ?? titleFilter ?? "").trim();
  const cleanedQuery = query
    .replace(/^title\s*:\s*/i, "")
    .replace(/["']/g, "")
    .toLocaleLowerCase();
  const tokens = cleanedQuery.split(/\s+/).filter(Boolean);
  const matches =
    tokens.length === 0
      ? []
      : books.filter((book) => {
          const haystack = `${book.title} ${book.author_name.join(" ")}`.toLocaleLowerCase();
          return tokens.every((token) => haystack.includes(token));
        });

  const offsetValue = Number(url.searchParams.get("offset"));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 10));
  let start = (page - 1) * limit;
  if (url.searchParams.has("offset") && Number.isInteger(offsetValue) && offsetValue >= 0) start = offsetValue;
  const requestedFields = url.searchParams.get("fields")?.split(",").filter(Boolean);
  const selectedBooks = matches.slice(start, start + limit).map((book) => {
    if (!requestedFields || requestedFields.includes("*")) return book;
    return Object.fromEntries(
      requestedFields.filter((field) => Object.hasOwn(book, field)).map((field) => [field, book[field]]),
    );
  });

  return {
    numFound: matches.length,
    start,
    numFoundExact: true,
    docs: selectedBooks,
  };
}

function mealPlansResponse(url) {
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const matching = mealPlans.filter((plan) => {
    if (startDate && plan.date < startDate) return false;
    if (endDate && plan.date > endDate) return false;
    return true;
  });
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const requestedPerPage = Number(url.searchParams.get("perPage")) || 50;
  const perPage = requestedPerPage === -1 ? Math.max(matching.length, 1) : Math.max(1, requestedPerPage);
  const offset = (page - 1) * perPage;
  const totalPages = Math.ceil(matching.length / perPage);
  return {
    page,
    per_page: perPage,
    total: matching.length,
    total_pages: totalPages,
    items: matching.slice(offset, offset + perPage),
    next: null,
    previous: null,
  };
}

function geocodingResponse(url) {
  const name = url.searchParams.get("name")?.trim();
  if (!name) return { status: 400, body: { error: true, reason: "Parameter name is required" } };
  const needle = name.toLocaleLowerCase();
  const requestedCount = Number(url.searchParams.get("count")) || 10;
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 100) {
    return { status: 400, body: { error: true, reason: "Parameter count must be between 1 and 100." } };
  }
  const countryCode = url.searchParams.get("countryCode")?.toLocaleUpperCase();
  const results = geocodingLocations.filter((location) => {
    const matchesName =
      location.name.toLocaleLowerCase().startsWith(needle) || location.country.toLocaleLowerCase() === needle;
    return matchesName && (!countryCode || location.country_code === countryCode);
  });
  return { status: 200, body: { results: results.slice(0, requestedCount) } };
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  if (!routes.has(pathname)) {
    sendJson(response, 404, { error: "not found" });
    return;
  }

  if (pathname !== "/health") recordRequest(request.method ?? "UNKNOWN", pathname);

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "method not allowed" }, { Allow: "GET" });
    return;
  }

  if (pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      host: HOST,
      port: PORT,
      date: BENCHMARK_DATE,
      services: ["sonarr", "mealie", "openlibrary", "openmeteo"],
      requests: [...requestCounts.entries()].map(([key, count]) => {
        const splitAt = key.indexOf(" ");
        return { method: key.slice(0, splitAt), path: key.slice(splitAt + 1), count };
      }),
    });
    return;
  }

  if (pathname.startsWith("/sonarr/") && request.headers["x-api-key"] !== SONARR_API_KEY) {
    sendJson(response, 401, { error: "unauthorized" });
    return;
  }
  if (pathname.startsWith("/mealie/") && request.headers.authorization !== `Bearer ${MEALIE_TOKEN}`) {
    sendJson(response, 401, { error: "unauthorized" });
    return;
  }

  if (pathname === "/sonarr/api/v3/series") {
    sendJson(response, 200, sonarrSeries);
    return;
  }
  if (pathname === "/sonarr/api/v3/queue") {
    sendJson(response, 200, sonarrQueue);
    return;
  }
  if (pathname === "/mealie/api/households/mealplans/today") {
    sendJson(
      response,
      200,
      mealPlans.filter((plan) => plan.date === BENCHMARK_DATE),
    );
    return;
  }
  if (pathname === "/mealie/api/households/mealplans") {
    sendJson(response, 200, mealPlansResponse(url));
    return;
  }
  if (pathname === "/openlibrary/search.json") {
    sendJson(response, 200, openLibraryResponse(url));
    return;
  }
  if (pathname === "/openmeteo/v1/search") {
    const result = geocodingResponse(url);
    sendJson(response, result.status, result.body);
    return;
  }
  if (pathname === "/openmeteo/v1/forecast") {
    const result = forecastResponse(url);
    sendJson(response, result.status, result.body);
    return;
  }

  sendJson(response, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`assistant benchmark fixture listening at http://${HOST}:${PORT}\n`);
});
