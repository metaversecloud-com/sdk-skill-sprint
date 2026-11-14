import { Page } from "@playwright/test";
import { Question, SAMPLE_QUESTIONS, SeedOptions, TopiaWorld, expect } from "../../fixtures";

/** Opens the app the way the Experience Engine does and completes the WebRTC handshake as the engine. */
export async function openConnected(page: Page, world: TopiaWorld, seed: SeedOptions = {}) {
  await world.seed({ engine: true, ...seed });
  await page.goto(world.url("/"));
  await world.connectEngine(page);
}

/** Connected app that has received the engine's "start" event with `questions`. */
export async function startRace(page: Page, world: TopiaWorld, questions: Record<string, Question> = SAMPLE_QUESTIONS) {
  await openConnected(page, world);
  await world.engineSend(page, "start", { questions });
  await expect(page.getByRole("heading", { name: "Question 1:" })).toBeVisible();
}

/** Clicks an option of the question on screen. */
export async function pick(page: Page, option: string) {
  await page.getByRole("button", { name: option, exact: true }).click();
}

/** Answers every sample question correctly, waiting for each to advance. */
export async function answerAllCorrectly(page: Page, questions: Record<string, Question> = SAMPLE_QUESTIONS) {
  for (const key of Object.keys(questions).sort()) {
    const q = questions[key];
    await expect(page.getByText(q.text)).toBeVisible();
    await pick(page, q.options[q.correctIndex]);
  }
}

/** Messages of one type the app sent to the engine. */
export async function sent(page: Page, world: TopiaWorld, type: string) {
  return (await world.engineInbox(page)).filter((m) => m.payload?.type === type);
}
