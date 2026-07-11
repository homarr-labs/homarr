export interface PocketBaseSseFrame {
  event: string;
  id?: string;
  data: string;
}

export const createRealtimeMetricsTopic = (systemId: string) =>
  `rt_metrics?options=${encodeURIComponent(JSON.stringify({ query: { system: systemId } }))}`;

export class PocketBaseSseParser {
  private buffer = "";
  private event = "message";
  private id: string | undefined;
  private dataLines: string[] = [];

  public push(chunk: string): PocketBaseSseFrame[] {
    this.buffer += chunk;
    const frames: PocketBaseSseFrame[] = [];
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const frame = this.processLine(line);
      if (frame) frames.push(frame);
    }

    return frames;
  }

  public finish(): PocketBaseSseFrame[] {
    const frames: PocketBaseSseFrame[] = [];
    if (this.buffer !== "") {
      const frame = this.processLine(this.buffer);
      if (frame) frames.push(frame);
      this.buffer = "";
    }
    const trailingFrame = this.dispatch();
    if (trailingFrame) frames.push(trailingFrame);
    return frames;
  }

  private processLine(line: string): PocketBaseSseFrame | null {
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) return null;

    const colonIndex = line.indexOf(":");
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let value = colonIndex === -1 ? "" : line.slice(colonIndex + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") this.event = value;
    else if (field === "id") this.id = value;
    else if (field === "data") this.dataLines.push(value);
    return null;
  }

  private dispatch(): PocketBaseSseFrame | null {
    if (this.dataLines.length === 0 && this.event === "message" && this.id === undefined) return null;
    const frame = { event: this.event, id: this.id, data: this.dataLines.join("\n") };
    this.event = "message";
    this.id = undefined;
    this.dataLines = [];
    return frame;
  }
}
