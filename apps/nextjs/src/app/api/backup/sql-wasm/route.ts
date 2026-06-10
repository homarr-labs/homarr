import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

const wasmCandidates = [
  path.join(process.cwd(), "public/sql-wasm.wasm"),
  path.join(process.cwd(), "apps/nextjs/public/sql-wasm.wasm"),
  path.resolve(process.cwd(), "../../node_modules/sql.js/dist/sql-wasm.wasm"),
  path.join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm"),
];

let cachedWasm: Buffer | null = null;

export async function GET() {
  if (!cachedWasm) {
    const found = wasmCandidates.find((p) => fs.existsSync(p));
    if (!found) {
      return NextResponse.json({ error: "WASM binary not found" }, { status: 500 });
    }
    cachedWasm = fs.readFileSync(found);
  }

  return new NextResponse(new Uint8Array(cachedWasm), {
    headers: {
      "Content-Type": "application/wasm",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
