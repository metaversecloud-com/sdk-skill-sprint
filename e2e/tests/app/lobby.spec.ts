// Before the race: countdown while players load, and players who connect after the start.
import { SAMPLE_QUESTIONS, expect, test } from "../../fixtures";
import { openConnected } from "./helpers";

test("shows the engine's countdown and ticks it down", async ({ page, world }) => {
  await openConnected(page, world);

  await world.engineSend(page, "countdownUpdate", { timeLeft: 9, numLoaded: 2, totalPlayers: 3 });

  await expect(page.getByRole("heading", { name: "The game will begin in 9…" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The game will begin in 8…" })).toBeVisible();
});

test("a new countdown update restarts the counter", async ({ page, world }) => {
  await openConnected(page, world);
  await world.engineSend(page, "countdownUpdate", { timeLeft: 3, numLoaded: 1, totalPlayers: 3 });
  await expect(page.getByRole("heading", { name: "The game will begin in 3…" })).toBeVisible();

  await world.engineSend(page, "countdownUpdate", { timeLeft: 20, numLoaded: 3, totalPlayers: 3 });

  await expect(page.getByRole("heading", { name: "The game will begin in 20…" })).toBeVisible();
});

test("waits for the remaining players once the countdown runs out", async ({ page, world }) => {
  await openConnected(page, world);

  await world.engineSend(page, "countdownUpdate", { timeLeft: -1, numLoaded: 2, totalPlayers: 5 });

  await expect(page.getByRole("heading", { name: "Waiting for 3 player(s) to load" })).toBeVisible();
});

test("a player who joins mid-race waits for the next one, then plays it", async ({ page, world }) => {
  await openConnected(page, world);

  await world.engineSend(page, "gameStartedOnConnect");
  await expect(page.getByRole("heading", { name: "You Joined Late" })).toBeVisible();
  await expect(page.getByText("You're in the queue for the next game!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mercury" })).toHaveCount(0);

  await world.engineSend(page, "start", { questions: SAMPLE_QUESTIONS });
  await expect(page.getByRole("heading", { name: "Question 1:" })).toBeVisible();
  await expect(page.getByText("What planet is closest to the Sun?")).toBeVisible();
});
