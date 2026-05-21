/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { StartedTestContainer } from "testcontainers";
import { GenericContainer, getContainerRuntimeClient, ImageName, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { createId } from "@homarr/common";
import { createDb } from "@homarr/db/test";

import { NextcloudIntegration } from "../src";

// Mock the database
vi.mock("@homarr/db", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/db")>();
  return {
    ...actual,
    db: createDb(),
  };
});

// Mock certificate verification
vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockImplementation(() => {
      return Promise.resolve([]);
    }),
  };
});

const IMAGE_NAME = "nextcloud:latest";
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin123";

interface CalendarTestEvent {
  summary: string;
  description?: string;
  location?: string;
  color?: string;
  dtstart: string;
  dtend: string;
  rrule?: string;
  timezone?: string;
}

describe("Nextcloud integration", () => {
  let startedContainer: StartedTestContainer | null = null;
  let nextcloudIntegration: NextcloudIntegration | null = null;

  beforeAll(async () => {
    const containerRuntimeClient = await getContainerRuntimeClient();
    await containerRuntimeClient.image.pull(ImageName.fromString(IMAGE_NAME));

    startedContainer = await prepareNextcloudContainerAsync();
    nextcloudIntegration = createNextcloudIntegration(startedContainer);
  }, 100_000);

  afterAll(async () => {
    if (startedContainer) {
      await startedContainer.stop();
      startedContainer = null;
    }
  });

  describe("Test connection", () => {
    test("Test connection > Should work with valid credentials", async () => {
      // Act
      const result = await nextcloudIntegration!.testConnectionAsync();

      // Assert
      expect(result.success).toBe(true);
    }, 20_000);

    test("Test connection > Should fail with invalid credentials", async () => {
      // Arrange
      const invalidIntegration = createNextcloudIntegration(startedContainer!, "wrong-user", "wrong-pass");

      // Act
      const result = await invalidIntegration.testConnectionAsync();

      // Assert
      expect(result.success).toBe(false);
    }, 20_000);
  });

  describe("Retrieve calendar events", () => {
    test("Retrieve calendar events > Should retrieve all fields correctly", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Test Meeting",
        description: "This is a test meeting",
        location: "Conference Room A",
        color: "#FF5733",
        dtstart: "20260415T140000Z",
        dtend: "20260415T150000Z",
      };
      const start = new Date("2026-04-01T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(1);
      const retrievedEvent = relevantEvents[0];
      expect(retrievedEvent).toMatchObject({
        title: testEvent.summary,
        description: testEvent.description,
        location: testEvent.location,
        indicatorColor: testEvent.color,
      });
      expect(retrievedEvent!.startDate.toISOString()).toBe("2026-04-15T14:00:00.000Z");
      expect(retrievedEvent!.endDate?.toISOString()).toBe("2026-04-15T15:00:00.000Z");
    }, 20_000);
    test("Retrieve calendar events > Should work with only required fields", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Simple Event",
        dtstart: "20260415T140000Z",
        dtend: "20260415T150000Z",
      };
      const start = new Date("2026-04-01T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(1);
      const retrievedEvent = relevantEvents[0];
      expect(retrievedEvent?.location).toBeNull();
      expect(retrievedEvent?.description).toBeNull();
      expect(retrievedEvent?.indicatorColor).toBe("#ff8600"); // Default color
    }, 20_000);
    test("Retrieve calendar events > Should work with timezone specified", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Timezone Event",
        dtstart: "20260415T140000",
        dtend: "20260415T150000",
        timezone: "Asia/Tokyo",
      };
      const start = new Date("2026-04-01T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(1);
      const retrievedEvent = relevantEvents[0];

      expect(retrievedEvent!.startDate.toISOString()).toBe("2026-04-15T05:00:00.000Z"); // 14:00 in Tokyo is 05:00 UTC
      expect(retrievedEvent!.endDate?.toISOString()).toBe("2026-04-15T06:00:00.000Z"); // 15:00 in Tokyo is 06:00 UTC
    }, 120_000);
    test("Retrieve calendar events > Should work with event that starts before the range but ends within the range", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Early Meeting",
        dtstart: "20260401T230000Z", // Starts before the range
        dtend: "20260402T010000Z", // Ends within the range
      };
      const start = new Date("2026-04-02T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(1);
    }, 20_000);
    test("Retrieve calendar events > Should work with event that starts within the range but ends after the range", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Late Meeting",
        dtstart: "20260430T230000Z", // Starts within the range
        dtend: "20260501T010000Z", // Ends after the range
      };
      const start = new Date("2026-04-01T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(1);
    }, 20_000);
    test("Retrieve calendar events > Should not retrieve events outside the range", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Out of Range Meeting",
        dtstart: "20260301T140000Z", // Starts before the range
        dtend: "20260301T150000Z", // Ends before the range
      };
      const start = new Date("2026-04-01T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(0);
    }, 20_000);
    test("Retrieve calendar events > Should work with events that begin before the range and end after the range", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Spanning Meeting",
        dtstart: "20260330T230000Z", // Starts before the range
        dtend: "20260501T010000Z", // Ends after the range
      };
      const start = new Date("2026-04-01T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(1);
    }, 20_000);
    test("Retrieve calendar events > Should work with recurring events first occurrence before the range", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Recurring Meeting",
        dtstart: "20260330T140000Z", // First occurrence starts before the range
        dtend: "20260330T150000Z",
        rrule: "FREQ=DAILY;COUNT=5", // Daily for 5 occurrences
      };
      const start = new Date("2026-04-01T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(3);
    }, 20_000);
    test("Retrieve calendar events > Should work with recurring events that go beyond the range", async () => {
      // Arrange
      const calendarName = createId();
      const testEvent: CalendarTestEvent = {
        summary: "Working Week",
        dtstart: "20260302T090000Z",
        dtend: "20260306T170000Z",
        rrule: "FREQ=WEEKLY;COUNT=10",
      };
      const start = new Date("2026-04-01T00:00:00Z");
      const end = new Date("2026-04-30T23:59:59Z");

      await createCalendarAsync(startedContainer!, calendarName);
      await createCalendarEventAsync(startedContainer!, calendarName, testEvent);

      // Act
      const events = await nextcloudIntegration!.getCalendarEventsAsync(start, end);

      // Assert
      const relevantEvents = events.filter((event) => event.title === testEvent.summary);
      expect(relevantEvents).toHaveLength(5);
    });
  });
});

/**
 * Prepares a Nextcloud container with proper configuration
 */
async function prepareNextcloudContainerAsync(): Promise<StartedTestContainer> {
  const container = createNextcloudContainer();
  const startedContainer = await container.start();

  return startedContainer;
}

/**
 * Creates a Nextcloud container with proper configuration
 */
function createNextcloudContainer() {
  return new GenericContainer(IMAGE_NAME)
    .withEnvironment({
      NEXTCLOUD_ADMIN_USER: DEFAULT_USERNAME,
      NEXTCLOUD_ADMIN_PASSWORD: DEFAULT_PASSWORD,
      NEXTCLOUD_TRUSTED_DOMAINS: "*",
      SQLITE_DATABASE: "nextcloud", // Use SQLite for faster startup
    })
    .withExposedPorts(80)
    .withWaitStrategy(Wait.forHttp("/status.php", 80).forStatusCode(200))
    .withStartupTimeout(120_000);
}

/**
 * Creates a Nextcloud integration instance
 */
function createNextcloudIntegration(
  container: StartedTestContainer,
  username?: string,
  password?: string,
): NextcloudIntegration {
  return new NextcloudIntegration({
    id: "1",
    decryptedSecrets: [
      {
        kind: "username",
        value: username ?? DEFAULT_USERNAME,
      },
      {
        kind: "password",
        value: password ?? DEFAULT_PASSWORD,
      },
    ],
    name: "Nextcloud",
    url: `http://${container.getHost()}:${container.getMappedPort(80)}`,
    externalUrl: null,
  });
}

/**
 * Creates a calendar in Nextcloud via OCS API
 */
async function createCalendarAsync(container: StartedTestContainer, calendarName: string): Promise<void> {
  const host = container.getHost();
  const port = container.getMappedPort(80);
  const url = `http://${host}:${port}/remote.php/dav/calendars/${DEFAULT_USERNAME}/${calendarName}`;

  const auth = Buffer.from(`${DEFAULT_USERNAME}:${DEFAULT_PASSWORD}`).toString("base64");

  const response = await fetch(url, {
    method: "MKCALENDAR",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/xml",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
      <c:mkcalendar xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:d="DAV:">
        <d:set>
          <d:prop>
            <d:displayname>${calendarName}</d:displayname>
          </d:prop>
        </d:set>
      </c:mkcalendar>`,
  });

  if (!response.ok && response.status !== 201) {
    throw new Error(`Failed to create calendar: ${response.status} ${response.statusText}`);
  }
}

/**
 * Creates a calendar event in Nextcloud via CalDAV
 */
async function createCalendarEventAsync(
  container: StartedTestContainer,
  calendarName: string,
  event: CalendarTestEvent,
): Promise<void> {
  const host = container.getHost();
  const port = container.getMappedPort(80);
  const id = createId();
  const url = `http://${host}:${port}/remote.php/dav/calendars/${DEFAULT_USERNAME}/${calendarName}/${id}.ics`;

  const auth = Buffer.from(`${DEFAULT_USERNAME}:${DEFAULT_PASSWORD}`).toString("base64");

  // Build iCalendar format
  const icalData = buildICalEvent(id, event);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "text/calendar",
    },
    body: icalData,
  });

  if (!response.ok && response.status !== 201) {
    throw new Error(`Failed to create event: ${response.status} ${response.statusText}`);
  }
}

/**
 * Builds an iCalendar format string from event data
 */
function buildICalEvent(uid: string, event: CalendarTestEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Homarr Tests//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART${event.timezone ? `;TZID=${event.timezone}` : ""}:${event.dtstart}`,
    `DTEND${event.timezone ? `;TZID=${event.timezone}` : ""}:${event.dtend}`,
    `SUMMARY:${event.summary}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${event.description}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }

  if (event.color) {
    lines.push(`COLOR:${event.color}`);
  }

  if (event.rrule) {
    lines.push(`RRULE:${event.rrule}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}
