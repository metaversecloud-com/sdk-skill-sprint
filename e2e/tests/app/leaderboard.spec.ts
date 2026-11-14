// The leaderboard is built from the engine's "completion" events and shown on the end screens.
import { expect, test } from "../../fixtures";
import { openConnected } from "./helpers";

test("ranks finishers by time with DNFs last and ignores repeats", async ({ page, world }) => {
  await openConnected(page, world);
  await world.engineSend(page, "gameStartedOnConnect");
  await expect(page.getByRole("heading", { name: "You Joined Late" })).toBeVisible();

  await world.engineSend(page, "completion", { username: "Slow", time: 125_000 });
  await world.engineSend(page, "completion", { username: "Quitter", time: "DNF" });
  await world.engineSend(page, "completion", { username: "Fast", time: 9_500 });
  await world.engineSend(page, "completion", { username: "Fast", time: 1_000 });

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveText(["1Fast0:09", "2Slow2:05", "3QuitterDNF"]);
});

test("shows the top 8 and shortens long names", async ({ page, world }) => {
  await openConnected(page, world);
  await world.engineSend(page, "gameStartedOnConnect");
  await expect(page.getByRole("heading", { name: "You Joined Late" })).toBeVisible();

  for (let n = 1; n <= 10; n++) {
    await world.engineSend(page, "completion", { username: `Player number ${n} with a long name`, time: n * 1000 });
  }

  await expect(page.locator("tbody tr")).toHaveCount(8);
  await expect(page.locator("tbody tr").first()).toHaveText("1Player number 1 …0:01");
});
