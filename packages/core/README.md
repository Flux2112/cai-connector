# @defysoftware/cai-core

Typed client for the **Cloudera AI (CML) API v2**, with **zero runtime dependencies**.

Part of the [cai-connector](https://github.com/Flux2112/cai-connector) monorepo. It exists to
be shared by the `cai` CLI and the *CAI Connector* VS Code extension — and the extension's
no-runtime-dependency rule is why this package has none either.

```ts
import { createClient, resolveProject, whoami } from "@defysoftware/cai-core";

const client = createClient({
  baseUrl: "https://ml.example.com",
  apiKey: process.env.CML_API_KEY!,
});

console.log(await whoami(client));

const project = await resolveProject(client, "hanke/analysis");
const runs = await client.get("/api/v2/projects/{project_id}/jobs", {
  path: { project_id: project.id! },
});
```

## The typed surface

Paths, parameters and responses come from the instance's own `swagger.json`, so
`client.get` only accepts paths the spec declares, only accepts the parameters that path
takes, and returns that operation's 200 body. A path that takes `{project_id}` will not
compile without one.

`client.raw(method, path, options)` is the untyped escape hatch for anything the spec does
not describe, `client.bytes(...)` returns a response body verbatim — a download decoded as
text would be corrupted — and `options.rawBody` sends one verbatim, which is what the single
multipart operation in the API needs.

Two things worth knowing before using the file operations, both verified against a live
instance rather than read off the spec:

- **`uploadFile` does not replace.** Uploading onto an occupied path keeps the existing file
  and stores yours beside it as `name(1).ext`, answering 200 without saying which name it
  chose. The upload's destination is also the multipart *field name*, and it travels in the
  body, so `assertUploadPath` refuses an absolute path or a `..` segment — nothing in the URL
  layer sees it.
- **`search_filter` is case-sensitive and matches substrings**, so `resolveProject` treats it
  as a narrowing hint only: it matches on this side, prefers an exact-case hit, and falls
  back to one unfiltered listing when the hint drops the project (`hanke/dse` naming a
  project CML reports as `HANKE`/`DSE`).

## Options

| Option | Purpose |
|---|---|
| `baseUrl` | Instance URL. Trailing slashes are trimmed. |
| `apiKey` | The same key `cdswctl login` takes — there is only one credential. |
| `fetch` | Inject a transport. Defaults to the global `fetch`. |
| `log` | Called with one line per request. The API key is redacted before it gets there. |
| `timeoutMs` | Default 30 000. Passing your own `signal` on a request opts out of it. |

## Errors

Everything thrown extends `CaiError`.

- `CaiRequestError` — bad arguments, caught before anything reaches the network.
- `CaiTransportError` — no HTTP response at all: DNS, TLS, proxy, timeout.
- `CaiApiError` — a non-2xx answer, carrying `status`, the API's `code` and `message`, and
  a truncated body. `isAuthFailure` covers 401 and 403.

The split between the last two is deliberate: a *failed* listing must not be read as "the
thing is gone".

## Pagination

Every v2 list endpoint returns an array plus `next_page_token`. `paginate` yields items
lazily, `collect` gathers them, and both refuse to follow a repeated token or to run past a
page cap — an endless loop against a paginated API is worse than an error.

## The session layer

`src/session/` is not an API client: it is `cdswctl.exe`, the extension's
`session_history.json`, and `~/.ssh/config`. It lives here because API v2 has **no
session endpoints at all** — no create, no stop, no SSH — so a session is a spawned
process plus a file, and both the CLI and (eventually) the extension need the same
rules for it. Windows-only, and the only part of this package that spawns anything.

It is a port of logic the extension still holds its own copy of; the tests here
assert the same rules, including that the JSON written has the same shape, because
the two processes read each other's records.

## Regenerating the types

The spec is committed at `spec/swagger.json` because the instance is on an internal host
that CI cannot reach.

```bash
npm run generate -w @defysoftware/cai-core                        # from the committed spec
npm run generate -w @defysoftware/cai-core -- --url $CAI_URL      # refetch first
npm run generate -w @defysoftware/cai-core -- --check             # fail if types are stale
```

Cloudera AI serves Swagger 2.0 and `openapi-typescript` v7 reads OpenAPI 3.x, so generation
converts with `swagger2openapi` first. Both are devDependencies; neither ships.

## Licence

GPL-3.0-or-later.
