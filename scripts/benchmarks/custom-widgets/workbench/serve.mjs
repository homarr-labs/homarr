import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
const base = resolve(process.env.OUTPUT ?? `${import.meta.dirname}/../output/workbench`);
http
  .createServer(async (request, response) => {
    try {
      const path = new URL(request.url, "http://localhost").pathname;
      const file = resolve(base, `.${path}`);
      if (!file.startsWith(`${base}${sep}`)) {
        response.writeHead(403).end("forbidden");
        return;
      }
      const data = await readFile(file);
      response.setHeader(
        "Content-Type",
        { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json" }[
          extname(path)
        ] ?? "text/plain",
      );
      response.end(data);
    } catch {
      response.statusCode = 404;
      response.end("not found");
    }
  })
  .listen(Number(process.env.PORT ?? 4187), "127.0.0.1");
