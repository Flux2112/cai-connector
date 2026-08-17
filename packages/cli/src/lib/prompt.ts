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

/*
 * A hidden line reader, because @oclif/core v4 dropped `ux.prompt` and the
 * dependency budget for this package is @oclif/core and nothing else.
 *
 * Raw mode rather than the usual trick of overriding readline's private
 * `_writeToOutput`: this uses only documented API, and a masked prompt that
 * silently starts echoing after a Node upgrade would leak the key to the
 * terminal and to the scrollback.
 */

const ETX = "";
const BACKSPACE = /^[]$/;

/** Read a secret from a TTY without echoing it. The prompt goes to stderr. */
export async function promptSecret(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    throw new Error("stdin is not a terminal");
  }

  process.stderr.write(question);
  const wasRaw = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise<string>((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      process.stderr.write("\n");
    };

    const onData = (chunk: Buffer) => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          cleanup();
          resolve(buffer);
          return;
        }
        if (ch === ETX) {
          cleanup();
          reject(new Error("cancelled"));
          return;
        }
        if (BACKSPACE.test(ch)) {
          buffer = buffer.slice(0, -1);
          continue;
        }
        buffer += ch;
      }
    };

    stdin.on("data", onData);
  });
}

/** Read all of a piped stdin. Used when there is no terminal to prompt on. */
export async function readPipedInput(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}
