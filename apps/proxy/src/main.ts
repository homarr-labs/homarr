import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const PORT = 7575;
// Use docker host or fallback to localhost
const HOST = process.env.HOSTNAME ? "docker.internal" : "localhost";

const HTTP_SERVER_URL = `http://${HOST}:3000`;
const WEBSOCKET_SERVER_URL = `ws://${HOST}:3001`;

const httpServerProxy = createProxyMiddleware({
  target: HTTP_SERVER_URL,
  changeOrigin: true,
});

const websocketServerProxy = createProxyMiddleware({
  target: WEBSOCKET_SERVER_URL,
  changeOrigin: true,
  ws: true,
});

app.use("/ws", websocketServerProxy);
app.use("/", httpServerProxy);

const server = app.listen(PORT, HOST, () => {
  console.log(`Starting Proxy at ${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error("Error starting server:", err);
});
