import { describe, expect, it, vi } from "vitest";
import { JSONPath } from "jsonpath-plus";
import superjson from "superjson";

import {
  customWidgetImportSchema,
  customWidgetCreateSchema,
  displayConfigSchema,
} from "@homarr/validation/custom-widget";

import { flatDefinitionToFlowGraph } from "../migration";
import { executeFlowGraph } from "../executor";
import { getNodeType, getAllNodeTypes, getNodeTypesByCategory } from "../registry";

import nvdaFixture from "./fixtures/nvda-stock.json";
import jpyFixture from "./fixtures/jpy-conversion.json";
import dogFixture from "./fixtures/dog-facts.json";

import "../index";

describe("Custom Widget Fixtures", () => {
  describe("Import schema validation", () => {
    it("should validate NVDA stock fixture", () => {
      const result = customWidgetImportSchema.safeParse(nvdaFixture);
      expect(result.success).toBe(true);
    });

    it("should validate JPY conversion fixture", () => {
      const result = customWidgetImportSchema.safeParse(jpyFixture);
      expect(result.success).toBe(true);
    });

    it("should validate dog facts fixture", () => {
      const result = customWidgetImportSchema.safeParse(dogFixture);
      expect(result.success).toBe(true);
    });
  });

  describe("Export/Import round-trip", () => {
    const allFixtures = [
      { name: "NVDA stock", fixture: nvdaFixture },
      { name: "JPY conversion", fixture: jpyFixture },
      { name: "Dog facts", fixture: dogFixture },
    ];

    for (const { name, fixture } of allFixtures) {
      it(`should round-trip ${name} through JSON serialization`, () => {
        const exported = JSON.stringify(fixture, null, 2);
        const reimported = JSON.parse(exported);
        const result = customWidgetImportSchema.safeParse(reimported);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.name).toBe(fixture.name);
          expect(result.data.baseUrl).toBe(fixture.baseUrl);
          expect(result.data.endpoint).toBe(fixture.endpoint);
          expect(result.data.method).toBe(fixture.method);
          expect(result.data.authType).toBe(fixture.authType);
          expect(result.data.displayType).toBe(fixture.displayType);
        }
      });

      it(`should validate ${name} displayConfig against displayConfigSchema`, () => {
        const result = displayConfigSchema.safeParse(fixture.displayConfig);
        expect(result.success).toBe(true);
      });
    }

    it("should validate all fixtures against createSchema (with empty secrets)", () => {
      for (const { fixture } of allFixtures) {
        const createPayload = {
          ...fixture,
          secrets: [],
        };
        delete (createPayload as Record<string, unknown>).$schema;
        const result = customWidgetCreateSchema.safeParse(createPayload);
        expect(result.success).toBe(true);
      }
    });

    it("should preserve keyValue mappings through round-trip", () => {
      const exported = JSON.stringify(jpyFixture);
      const reimported = JSON.parse(exported);
      const result = customWidgetImportSchema.safeParse(reimported);

      expect(result.success).toBe(true);
      if (result.success) {
        const config = result.data.displayConfig;
        expect(config.type).toBe("keyValue");
        if (config.type === "keyValue") {
          expect(config.mappings).toHaveLength(2);
          expect(config.mappings[0]!.label).toBe("50 JPY → EUR");
          expect(config.mappings[0]!.jsonPath).toBe("$.rates.EUR");
          expect(config.mappings[0]!.unit).toBe("€");
          expect(config.mappings[1]!.label).toBe("50 JPY → USD");
          expect(config.mappings[1]!.jsonPath).toBe("$.rates.USD");
          expect(config.mappings[1]!.unit).toBe("$");
        }
      }
    });

    it("should preserve singleValue config through round-trip", () => {
      const exported = JSON.stringify(dogFixture);
      const reimported = JSON.parse(exported);
      const result = customWidgetImportSchema.safeParse(reimported);

      expect(result.success).toBe(true);
      if (result.success) {
        const config = result.data.displayConfig;
        expect(config.type).toBe("singleValue");
        if (config.type === "singleValue") {
          expect(config.jsonPath).toBe("$.data[0].attributes.body");
          expect(config.label).toContain("Dog");
        }
      }
    });
  });

  describe("Migration to flow graph", () => {
    const fixtures = [
      { name: "NVDA stock", fixture: nvdaFixture },
      { name: "JPY conversion", fixture: jpyFixture },
      { name: "Dog facts", fixture: dogFixture },
    ];

    for (const { name, fixture } of fixtures) {
      it(`should migrate ${name} to a valid flow graph`, () => {
        const graph = flatDefinitionToFlowGraph({
          baseUrl: fixture.baseUrl,
          endpoint: fixture.endpoint,
          method: fixture.method,
          authType: fixture.authType,
          headerName: "headerName" in fixture ? (fixture.headerName as string) : undefined,
          displayType: fixture.displayType,
          displayConfig: superjson.stringify(fixture.displayConfig),
        });

        expect(graph.nodes).toHaveLength(3);
        expect(graph.edges).toHaveLength(2);

        const nodeTypes = graph.nodes.map((n) => n.type);
        expect(nodeTypes).toContain("httpRequest");
        expect(nodeTypes).toContain("jsonPath");

        const httpNode = graph.nodes.find((n) => n.type === "httpRequest")!;
        expect(httpNode.data.method).toBe(fixture.method);
        expect(httpNode.data.url).toContain(fixture.baseUrl);
      });
    }

    it("should set apiKeyQuery auth on NVDA flow graph", () => {
      const graph = flatDefinitionToFlowGraph({
        baseUrl: nvdaFixture.baseUrl,
        endpoint: nvdaFixture.endpoint,
        method: nvdaFixture.method,
        authType: nvdaFixture.authType,
        headerName: nvdaFixture.headerName,
        displayType: nvdaFixture.displayType,
        displayConfig: superjson.stringify(nvdaFixture.displayConfig),
      });

      const httpNode = graph.nodes.find((n) => n.type === "httpRequest")!;
      expect(httpNode.data.authType).toBe("apiKeyQuery");
      expect(httpNode.data.headerName).toBe("apikey");
    });

    it("should set no auth on JPY and Dog fact flow graphs", () => {
      for (const fixture of [jpyFixture, dogFixture]) {
        const graph = flatDefinitionToFlowGraph({
          baseUrl: fixture.baseUrl,
          endpoint: fixture.endpoint,
          method: fixture.method,
          authType: fixture.authType,
          displayType: fixture.displayType,
          displayConfig: superjson.stringify(fixture.displayConfig),
        });

        const httpNode = graph.nodes.find((n) => n.type === "httpRequest")!;
        expect(httpNode.data.authType).toBe("none");
      }
    });
  });

  describe("JSONPath extraction on mock API responses", () => {
    const mockAlphaVantageResponse = {
      "Global Quote": {
        "01. symbol": "NVDA",
        "02. open": "135.5000",
        "03. high": "137.2000",
        "04. low": "134.0100",
        "05. price": "136.7200",
        "06. volume": "41283940",
        "07. latest trading day": "2026-06-05",
        "08. previous close": "135.1000",
        "09. change": "1.6200",
        "10. change percent": "1.1992%",
      },
    };

    const mockFrankfurterResponse = {
      amount: 50.0,
      base: "JPY",
      date: "2026-06-05",
      rates: { EUR: 0.2687, USD: 0.31277 },
    };

    const mockDogApiResponse = {
      data: [
        {
          id: "test-id",
          type: "fact",
          attributes: {
            body: "A dog's sense of smell is 10,000 times stronger than a human's.",
          },
        },
      ],
    };

    it("should extract all NVDA stock fields", () => {
      const mappings = nvdaFixture.displayConfig.mappings;

      const expected: Record<string, unknown> = {
        Symbol: "NVDA",
        Price: "136.7200",
        Change: "1.6200",
        "Change %": "1.1992%",
        Volume: "41283940",
      };

      for (const mapping of mappings) {
        const result = JSONPath({
          path: mapping.jsonPath,
          json: mockAlphaVantageResponse,
          wrap: false,
        });
        expect(result).toBe(expected[mapping.label]);
      }
    });

    it("should extract JPY→EUR and JPY→USD conversion rates", () => {
      const mappings = jpyFixture.displayConfig.mappings;

      const eurMapping = mappings.find((m) => m.label.includes("EUR"))!;
      const usdMapping = mappings.find((m) => m.label.includes("USD"))!;

      const eurResult = JSONPath({
        path: eurMapping.jsonPath,
        json: mockFrankfurterResponse,
        wrap: false,
      });
      expect(eurResult).toBe(0.2687);

      const usdResult = JSONPath({
        path: usdMapping.jsonPath,
        json: mockFrankfurterResponse,
        wrap: false,
      });
      expect(usdResult).toBe(0.31277);
    });

    it("should extract dog fact string", () => {
      const result = JSONPath({
        path: dogFixture.displayConfig.jsonPath,
        json: mockDogApiResponse,
        wrap: false,
      });
      expect(result).toBe("A dog's sense of smell is 10,000 times stronger than a human's.");
      expect(typeof result).toBe("string");
    });
  });

  describe("Flow graph execution with mocked fetch", () => {
    const mockFrankfurterResponse = {
      amount: 50.0,
      base: "JPY",
      date: "2026-06-05",
      rates: { EUR: 0.2687, USD: 0.31277 },
    };

    const mockDogApiResponse = {
      data: [
        {
          id: "abc-123",
          type: "fact",
          attributes: {
            body: "Dogs have three eyelids.",
          },
        },
      ],
    };

    it("should execute dog facts flow graph end-to-end", async () => {
      const graph = flatDefinitionToFlowGraph({
        baseUrl: dogFixture.baseUrl,
        endpoint: dogFixture.endpoint,
        method: dogFixture.method,
        authType: dogFixture.authType,
        displayType: dogFixture.displayType,
        displayConfig: superjson.stringify(dogFixture.displayConfig),
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockDogApiResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await executeFlowGraph(graph);
      const displayNode = Object.values(result)[0] as {
        type: string;
        value: unknown;
        label: string;
      };

      expect(displayNode.type).toBe("singleValue");
      expect(displayNode.value).toBe("Dogs have three eyelids.");

      vi.restoreAllMocks();
    });

    it("should execute JPY conversion with manually-built flow graph (2 JSONPath + merge)", async () => {
      const graph: import("../types").FlowGraph = {
        nodes: [
          {
            id: "http_1",
            type: "httpRequest",
            position: { x: 250, y: 50 },
            data: {
              url: "https://api.frankfurter.dev/v1/latest?from=JPY&to=EUR,USD&amount=50",
              method: "GET",
              authType: "none",
            },
          },
          {
            id: "jpath_eur",
            type: "jsonPath",
            position: { x: 100, y: 200 },
            data: { expression: "$.rates.EUR", wrap: false },
          },
          {
            id: "jpath_usd",
            type: "jsonPath",
            position: { x: 400, y: 200 },
            data: { expression: "$.rates.USD", wrap: false },
          },
          {
            id: "merge_1",
            type: "merge",
            position: { x: 250, y: 350 },
            data: { mode: "array" },
          },
          {
            id: "display_1",
            type: "keyValue",
            position: { x: 250, y: 500 },
            data: {
              labels: ["50 JPY → EUR", "50 JPY → USD"],
              units: ["€", "$"],
            },
          },
        ],
        edges: [
          { id: "e1", source: "http_1", target: "jpath_eur", sourceHandle: "response", targetHandle: "json" },
          { id: "e2", source: "http_1", target: "jpath_usd", sourceHandle: "response", targetHandle: "json" },
          { id: "e3", source: "jpath_eur", target: "merge_1", sourceHandle: "value", targetHandle: "a" },
          { id: "e4", source: "jpath_usd", target: "merge_1", sourceHandle: "value", targetHandle: "b" },
          { id: "e5", source: "merge_1", target: "display_1", sourceHandle: "merged", targetHandle: "entries" },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockFrankfurterResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await executeFlowGraph(graph);
      const displayNode = Object.values(result)[0] as {
        type: string;
        entries: Array<{ label: string; unit: string; value: unknown }>;
      };

      expect(displayNode.type).toBe("keyValue");
      expect(displayNode.entries).toHaveLength(2);
      expect(displayNode.entries[0]!.label).toBe("50 JPY → EUR");
      expect(displayNode.entries[0]!.value).toBe(0.2687);
      expect(displayNode.entries[0]!.unit).toBe("€");
      expect(displayNode.entries[1]!.label).toBe("50 JPY → USD");
      expect(displayNode.entries[1]!.value).toBe(0.31277);
      expect(displayNode.entries[1]!.unit).toBe("$");

      vi.restoreAllMocks();
    });

    it("should execute NVDA stock with mocked Alpha Vantage response", async () => {
      const mockNvdaResponse = {
        "Global Quote": {
          "01. symbol": "NVDA",
          "05. price": "136.72",
          "06. volume": "41283940",
          "09. change": "1.62",
          "10. change percent": "1.1992%",
        },
      };

      const graph = flatDefinitionToFlowGraph({
        baseUrl: nvdaFixture.baseUrl,
        endpoint: nvdaFixture.endpoint,
        method: nvdaFixture.method,
        authType: nvdaFixture.authType,
        headerName: nvdaFixture.headerName,
        displayType: nvdaFixture.displayType,
        displayConfig: superjson.stringify(nvdaFixture.displayConfig),
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockNvdaResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await executeFlowGraph(graph, { apiKey: "test-key" });
      const displayNode = Object.values(result)[0] as {
        type: string;
        entries: Array<{ label: string; value: unknown }>;
      };

      expect(displayNode.type).toBe("keyValue");
      expect(displayNode.entries.length).toBeGreaterThanOrEqual(1);

      vi.restoreAllMocks();
    });
  });

  describe("Node registry", () => {
    it("should have all expected node types registered", () => {
      const expectedTypes = [
        "httpRequest",
        "jsonPath",
        "merge",
        "template",
        "singleValue",
        "keyValue",
        "table",
        "lineChart",
        "areaChart",
        "barChart",
        "sparkline",
      ];

      for (const type of expectedTypes) {
        expect(getNodeType(type)).toBeDefined();
      }
    });

    it("should categorize source nodes correctly", () => {
      const sourceNodes = getNodeTypesByCategory("source");
      expect(sourceNodes.length).toBeGreaterThanOrEqual(1);
      expect(sourceNodes.every((n) => n.category === "source")).toBe(true);
    });

    it("should categorize transform nodes correctly", () => {
      const transformNodes = getNodeTypesByCategory("transform");
      expect(transformNodes.length).toBeGreaterThanOrEqual(3);
      expect(transformNodes.every((n) => n.category === "transform")).toBe(true);
    });

    it("should categorize display nodes correctly", () => {
      const displayNodes = getNodeTypesByCategory("display");
      expect(displayNodes.length).toBeGreaterThanOrEqual(7);
      expect(displayNodes.every((n) => n.category === "display")).toBe(true);
    });

    it("should have all nodes with schema, inputs, and outputs", () => {
      for (const node of getAllNodeTypes()) {
        expect(node.schema).toBeDefined();
        expect(node.execute).toBeInstanceOf(Function);
        expect(node.type).toBeTruthy();
        expect(node.label).toBeTruthy();
        expect(node.category).toMatch(/^(source|transform|display)$/);
      }
    });
  });

  describe("Live API integration (opt-in)", () => {
    const runLiveTests = process.env.TEST_LIVE_APIS === "true";

    it.skipIf(!runLiveTests)("should fetch live JPY conversion data", async () => {
      const response = await fetch("https://api.frankfurter.dev/v1/latest?from=JPY&to=EUR,USD&amount=50");
      expect(response.ok).toBe(true);

      const json = await response.json();
      expect(json.rates.EUR).toBeTypeOf("number");
      expect(json.rates.USD).toBeTypeOf("number");
      expect(json.amount).toBe(50);
      expect(json.base).toBe("JPY");

      for (const mapping of jpyFixture.displayConfig.mappings) {
        const extracted = JSONPath({ path: mapping.jsonPath, json, wrap: false });
        expect(extracted).toBeTypeOf("number");
        expect(extracted).toBeGreaterThan(0);
      }
    });

    it.skipIf(!runLiveTests)("should fetch live dog fact", async () => {
      const response = await fetch("https://dogapi.dog/api/v2/facts");
      expect(response.ok).toBe(true);

      const json = await response.json();
      const fact = JSONPath({
        path: dogFixture.displayConfig.jsonPath,
        json,
        wrap: false,
      });
      expect(fact).toBeTypeOf("string");
      expect(fact.length).toBeGreaterThan(10);
    });
  });
});
