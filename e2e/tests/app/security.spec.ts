// Server routes from the boilerplate the app still exposes: drop / remove clones of the key asset and
// world toasts (meant for admins; the admin screen is currently hidden), plus /game-state. And what
// the iframe tells the engine about answers: the engine can only score fairly if it can check them.
import { KEY_ASSET_ID, SCENE_DROP_ID, expect, test } from "../../fixtures";
import { pick, sent, startRace } from "./helpers";

const KEY_ASSET = { assetId: "asset-template", position: { x: 500, y: 500 } };
const clone = (id: string) => ({ id, assetId: "asset-template", uniqueName: `${SCENE_DROP_ID}-clone`, position: { x: 1, y: 1 } });

test.describe("admins", () => {
  test("drop a clone of the key asset next to it", async ({ request, world }) => {
    await world.seed({ isAdmin: true, asset: KEY_ASSET });

    const response = await request.post(world.api("/dropped-asset"));

    expect(await response.json()).toEqual({ success: true });
    const { assets } = await world.state();
    const dropped = Object.values(assets).filter((a: any) => a.id !== KEY_ASSET_ID);
    expect(dropped).toEqual([
      expect.objectContaining({
        assetId: "asset-template",
        uniqueName: `${SCENE_DROP_ID}-clone`,
        isInteractive: true,
        interactivePublicKey: "e2e-public-key",
      }),
    ]);
    const { x, y } = (dropped[0] as any).position;
    expect(x).toBeGreaterThanOrEqual(500);
    expect(x).toBeLessThan(700);
    expect(y).toBeGreaterThanOrEqual(500);
    expect(y).toBeLessThan(700);
    await expect.poll(async () => (await world.assetData()).droppedAssetCount).toBe(1);
  });

  test("remove every clone and nothing else", async ({ request, world }) => {
    await world.seed({
      isAdmin: true,
      asset: KEY_ASSET,
      extraAssets: {
        "clone-1": clone("clone-1"),
        "clone-2": clone("clone-2"),
        "other-1": { ...clone("other-1"), uniqueName: "someone-elses-asset" },
      },
    });

    const response = await request.post(world.api("/remove-dropped-assets"));

    expect(await response.json()).toEqual({ success: true });
    expect(Object.keys((await world.state()).assets).sort()).toEqual([KEY_ASSET_ID, "other-1"]);
    expect((await world.events("delete-asset")).map((e) => e.assetId).sort()).toEqual(["clone-1", "clone-2"]);
  });

  test("fire a toast to the whole world", async ({ request, world }) => {
    await world.seed({ isAdmin: true });

    const response = await request.put(world.api("/world/fire-toast"), { data: { title: "Race soon", text: "Get ready" } });

    expect((await response.json()).success).toBe(true);
    expect(await world.events("world-toast")).toEqual([expect.objectContaining({ title: "Race soon", text: "Get ready" })]);
  });
});

test.describe("players calling admin routes directly", () => {
  test("can't drop assets", async ({ request, world }) => {
    test.fail(true, "EXP-433: /dropped-asset has no admin check");
    await world.seed({ isAdmin: false, asset: KEY_ASSET });

    const response = await request.post(world.api("/dropped-asset"));

    expect(response.ok()).toBe(false);
    expect(Object.keys((await world.state()).assets)).toEqual([KEY_ASSET_ID]);
  });

  test("can't remove assets", async ({ request, world }) => {
    test.fail(true, "EXP-433: /remove-dropped-assets has no admin check");
    await world.seed({ isAdmin: false, extraAssets: { "clone-1": clone("clone-1") } });

    const response = await request.post(world.api("/remove-dropped-assets"));

    expect(response.ok()).toBe(false);
    expect((await world.state()).assets["clone-1"]).toBeTruthy();
  });

  test("can't broadcast a toast to everyone in the world", async ({ request, world }) => {
    test.fail(true, "EXP-433: /world/fire-toast has no admin check and takes any title and text");
    await world.seed({ isAdmin: false });

    const response = await request.put(world.api("/world/fire-toast"), {
      data: { title: "Free prize!", text: "Log in at https://example.invalid to claim it" },
    });

    expect(response.ok()).toBe(false);
    expect(await world.events("world-toast")).toEqual([]);
  });
});

test("game state initializes the key asset and returns only the visitor fields the app needs", async ({ request, world }) => {
  await world.seed({ isAdmin: true });

  const body = await (await request.get(world.api("/game-state"))).json();

  expect(body.success).toBe(true);
  expect(body.visitor).toEqual({ isAdmin: true, displayName: "E2E Player" });
  expect(await world.assetData()).toEqual({ droppedAssetCount: 0 });
});

test("reports every answer, right or wrong, with the option the player picked", async ({ page, world }) => {
  test.fail(true, "EXP-433: the browser grades answers itself and only reports correct ones, with its own timing");
  await startRace(page, world);

  await pick(page, "Venus");

  await expect.poll(() => sent(page, world, "answer"), { timeout: 2_000 }).toHaveLength(1);
  const [answer] = await sent(page, world, "answer");
  const picked = Object.values(answer.payload).some((v) => v === 2 || v === "Venus");
  expect(picked, `answer message names the picked option: ${JSON.stringify(answer.payload)}`).toBe(true);
});
