// The iframe only works inside the Experience Engine: it fetches ICE servers from Topia, sends its
// WebRTC offer through /api/signal, and then talks to the engine over a data channel.
import { GAME_ENGINE_ID, VISITOR_ID, expect, test } from "../../fixtures";
import { openConnected, sent } from "./helpers";

test("shows a spinner while it connects to the engine", async ({ page, world }) => {
  await world.seed({ engine: true });
  await page.goto(world.url("/"));

  await expect(page.getByAltText("Loading")).toBeVisible();
  await world.connectEngine(page);
  await expect(page.getByAltText("Loading")).toBeVisible();
});

test("sends its offer to the player's own visitor and reports connected", async ({ page, world }) => {
  await openConnected(page, world);

  expect(await world.events("send-signal")).toEqual([
    expect.objectContaining({ visitorId: String(VISITOR_ID), signalType: "offer" }),
  ]);
  expect(await sent(page, world, "connected")).toEqual([
    { eventId: "fromIframe", gameEngineId: GAME_ENGINE_ID, payload: { type: "connected", playerId: String(VISITOR_ID), success: true } },
  ]);
});

test("doesn't try to reach an engine when Topia didn't open a data channel", async ({ page, world }) => {
  await world.seed({ engine: true });
  const apiCalls: string[] = [];
  page.on("request", (r) => r.url().includes("/api/") && apiCalls.push(new URL(r.url()).pathname));

  await page.goto(world.url("/", { hasDataChannel: "" }));
  await page.waitForLoadState("networkidle");

  expect(apiCalls).toEqual([]);
  expect(await world.events("send-signal")).toEqual([]);
});

test("tells the player when it can't connect instead of spinning forever", async ({ page, world }) => {
  test.fail(true, "EXP-433: connection errors are swallowed, the spinner never goes away");
  await world.seed({ engine: true, twilioConfigError: true });

  await page.goto(world.url("/"));

  await expect(page.locator(".text-error")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByAltText("Loading")).toBeHidden();
});

test("only sends the engine its own events, no debug replies", async ({ page, world }) => {
  test.fail(true, "EXP-433: getVisitor answers every engine message with a 'howdy yall!' debug message");
  await openConnected(page, world);

  await world.engineSend(page, "countdownUpdate", { timeLeft: 5, numLoaded: 1, totalPlayers: 2 });
  await expect(page.getByRole("heading", { name: /The game will begin in/ })).toBeVisible();
  await world.engineSend(page, "countdownUpdate", { timeLeft: 4, numLoaded: 2, totalPlayers: 2 });
  await page.waitForTimeout(500);

  expect((await world.engineInbox(page)).map((m) => m.payload.type)).toEqual(["connected"]);
});
