/*
 * Copyright (C) 2026 Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import * as http from "node:http";
import type { AddressInfo } from "node:net";

export type RecordedRequest = {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
};

export type StubReply = {
  status?: number;
  json?: unknown;
  text?: string;
  /** Delay before replying, for timeout and abort tests. */
  delayMs?: number;
};

export type StubServer = {
  url: string;
  requests: RecordedRequest[];
  close(): Promise<void>;
};

/**
 * A real HTTP server on a real socket, so the tests exercise the default
 * `globalThis.fetch` transport rather than a hand-rolled double. The one thing
 * a stub cannot prove is TLS behaviour against the actual instance; everything
 * else — headers, query encoding, status mapping — is real here.
 */
export async function startStub(reply: (req: RecordedRequest) => StubReply): Promise<StubServer> {
  const requests: RecordedRequest[] = [];

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const recorded: RecordedRequest = {
        method: req.method ?? "",
        url: req.url ?? "",
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      };
      requests.push(recorded);

      const answer = reply(recorded);
      const send = () => {
        const payload = answer.text ?? (answer.json === undefined ? "" : JSON.stringify(answer.json));
        res.writeHead(answer.status ?? 200, { "content-type": "application/json" });
        res.end(payload);
      };
      if (answer.delayMs) {
        setTimeout(send, answer.delayMs).unref();
      } else {
        send();
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** Parse the query string of a recorded request into a plain object. */
export function queryOf(request: RecordedRequest): Record<string, string> {
  const url = new URL(request.url, "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
}
