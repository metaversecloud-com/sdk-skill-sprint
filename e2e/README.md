# End-to-end tests

Playwright tests that drive the real app (production build of `client/` + `server/`) in a browser.
The server's `@rtsdk/topia` calls go to `mock-topia/server.mjs`, an in-memory fake of the Topia public
API, so no Topia credentials, world or network access are needed. The PR check (`E2E`) runs them on
every push; see `.github/workflows/e2e.yml` (managed by Terraform in config_texts).

## Run

```bash
npm install                      # app deps, repo root
cd e2e
npm install
npx playwright install chromium
npm test                         # builds the app, starts the mock + app, runs all specs
npm run test:ui                  # interactive mode
```

Against the Docker image instead of local Node (what ships; needs Docker):

```bash
e2e/scripts/test-image.sh        # image exactly as the Dockerfile builds it
e2e/scripts/test-image.sh 24     # --build-arg NODE_VERSION=24, fails unless the image runs Node 24
```

Ports: app `3100`, mock `3101` (override with `APP_PORT` / `MOCK_TOPIA_PORT`).

## Skill Sprint and the Experience Engine

Skill Sprint only runs inside an Experience Engine game: the iframe fetches ICE servers
(`/api/ice-servers`), sends its WebRTC offer through `/api/signal` (Topia relays it to the engine) and
then talks to the engine over a data channel. The tests play the engine:

- `world.seed({ engine: true })` makes mock-topia hold the app's `send-signal-to-visitor` call until
  the test answers it (other worlds answer `{ success: false }`, as if no engine were listening).
- `world.connectEngine(page)` answers the offer with a real `RTCPeerConnection` inside the same page
  and waits for the app's `connected` message. Both peers are routed over 127.0.0.1, so it works on
  any machine (including laptops whose default route is a VPN tunnel).
- `world.engineSend(page, type, payload)` sends engine events (`countdownUpdate`, `start`,
  `gameStartedOnConnect`, `completion`); `world.engineInbox(page)` returns what the app sent back.

The fixture credentials include `hasDataChannel`, `gameEngineId` and `iframeId`, which Topia appends
for engine iframes. mock-topia also rejects `/api` calls that carry neither an `InteractiveJWT` nor an
API key, like the real API (the SDK sends no JWT when `getCredentials` returns `{ error }`).

## Layout

| Path | What it is | When forking into a new app |
|---|---|---|
| `tests/platform/` | Checks every SDK app must pass: health endpoint contract, app shell fallback, credential checks, the interactive secret never reaching the browser | Keep identical; only edit `app.config.ts` |
| `app.config.ts` | Lists the app's credentialed API routes and entry page for the platform tests | List every route that calls `getCredentials` |
| `tests/app/` | Skill Sprint tests: engine connection, lobby, race, leaderboard, admin routes and anti-cheat | Replace with tests for the app's own pages and rules |
| `fixtures.ts` | `world.seed({...})` builds one isolated Topia world per test; `world.url()` / `world.api()` add the session credentials Topia appends | Extend `seed` for the app's data objects |
| `mock-topia/server.mjs` | Fake Topia public API | Add routes for any endpoint the app calls that isn't there |

Every test gets its own world, so the suite runs fully in parallel. Each test also fails if the app
calls a public-API endpoint the mock doesn't implement, so an `@rtsdk/topia` upgrade that starts using
new endpoints can't pass silently. A full app example lives in sdk-quiz (`e2e/tests`).

## Known bugs

Tests for bugs that still exist are marked `test.fail(true, "...")`: they pass while the bug is
there and fail with "Expected to fail, but passed" once it's fixed, so the marker is removed in the
same change as the fix. An app that doesn't have the bug deletes the marker straight away.

| Test | Bug | Fix |
|---|---|---|
| `platform/secrets.spec.ts` (`GET /game-state`, `PUT /world/fire-toast`) | `server/index.ts` registers the `cleanReturnPayload` scrubber after the API routes, so it never runs. `/api/game-state` returns the raw `DroppedAsset` and `/api/world/fire-toast` the raw `World`, including `topia.interactiveSecret`. The iframe itself only calls `/ice-servers` and `/signal`, which don't leak. | Register the scrubber before `app.use("/api", router)`, or return plain objects from routes. Tracked in EXP-429. |
| `platform/credentials.spec.ts` "names the credential problem" | `getCredentials` returns `{ error }` instead of throwing, so requests with bad credentials carry on and fail later on a Topia call. | Throw from `getCredentials` (protected file: needs explicit approval). Tracked in EXP-428. |
| `app/security.spec.ts` "reports every answer…" | The browser grades answers with the `correctIndex` the engine sends and only reports correct ones, with its own timing. | Report every answer with the chosen option; let the engine grade and time it. EXP-433 #1. |
| `app/security.spec.ts` "players calling admin routes directly" (3) | `/dropped-asset`, `/remove-dropped-assets` and `/world/fire-toast` have no admin check. | Delete the routes or check `visitor.isAdmin`. EXP-433 #2. |
| `app/race.spec.ts` "a player who finished can race again…" | A new `start` event doesn't reset the round state. | Reset index, score and leaderboard on `start`. EXP-433 #3. |
| `app/race.spec.ts` "asks ten or more questions in order" | Question keys are sorted as text (q1, q10, q2…). | Sort by `questionNumber`. EXP-433 #4. |
| `app/connection.spec.ts` "tells the player when it can't connect…" | Connection errors are only logged; the spinner never goes away. | Show an error. EXP-433 #5. |
| `app/connection.spec.ts` "only sends the engine its own events…" | `getVisitor.ts` replies "howdy yall!" to every engine message. | Remove the debug reply. EXP-433 #6. |

## Conventions

- New tests are mutation-checked: break the behavior in the app and confirm the test goes red.
- Before merging, `npx playwright test --repeat-each=3` must pass every time.
