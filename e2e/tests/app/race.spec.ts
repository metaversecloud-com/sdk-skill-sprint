// The race itself: the engine's "start" event carries the questions, the iframe asks them one by one,
// reports correct answers to the engine and shows the result at the end.
import { GAME_ENGINE_ID, Question, SAMPLE_QUESTIONS, VISITOR_ID, expect, test } from "../../fixtures";
import { answerAllCorrectly, pick, sent, startRace } from "./helpers";

test("asks the first question with its options in order", async ({ page, world }) => {
  await startRace(page, world);

  await expect(page.getByText("What planet is closest to the Sun?")).toBeVisible();
  await expect(page.locator(".grid button")).toHaveText(["Earth", "Mercury", "Venus", "Mars"]);
  await expect(page.getByAltText("Loading")).toHaveCount(0);
});

test("a correct answer is confirmed, reported to the engine and moves on", async ({ page, world }) => {
  await startRace(page, world);

  await pick(page, "Mercury");

  await expect(page.getByText("Correct!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mercury" })).toHaveClass(/btn-success/);
  await expect.poll(() => sent(page, world, "answer")).toEqual([
    {
      eventId: "fromIframe",
      gameEngineId: GAME_ENGINE_ID,
      payload: { type: "answer", playerId: String(VISITOR_ID), questionId: 0, time: expect.any(Number) },
    },
  ]);
  await expect(page.getByRole("heading", { name: "Question 2:" })).toBeVisible();
  await expect(page.getByText("Which planet is known as the Red Planet?")).toBeVisible();
});

test("a wrong answer locks the question for a few seconds, then lets the player retry", async ({ page, world }) => {
  await startRace(page, world);

  await pick(page, "Venus");

  await expect(page.getByText("Sorry, that’s not right.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Venus" })).toHaveClass(/btn-danger/);
  for (const option of SAMPLE_QUESTIONS.q1.options) await expect(page.getByRole("button", { name: option })).toBeDisabled();
  expect(await sent(page, world, "answer")).toEqual([]);

  // Penalty: about 4 seconds later the same question comes back, unanswered.
  await expect(page.getByRole("button", { name: "Mercury" })).toBeEnabled({ timeout: 6_000 });
  await expect(page.getByText("Sorry, that’s not right.")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Question 1:" })).toBeVisible();

  await pick(page, "Mercury");
  await expect(page.getByRole("heading", { name: "Question 2:" })).toBeVisible();
});

test("answering every question shows the finish screen", async ({ page, world }) => {
  await startRace(page, world);

  await answerAllCorrectly(page);

  await expect(page.getByRole("heading", { name: "All Done!" })).toBeVisible();
  await expect(page.getByText("Great job, you’ve answered all 3 questions.")).toBeVisible();
  await expect(page.getByText("Accuracy: 100%")).toBeVisible();
  await expect(page.getByText(/^Time: \d+ seconds?$/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  expect((await sent(page, world, "answer")).map((m) => m.payload.questionId)).toEqual([0, 1, 2]);
});

test("a wrong answer costs accuracy", async ({ page, world }) => {
  await startRace(page, world);

  await pick(page, "Earth");
  await expect(page.getByRole("button", { name: "Mercury" })).toBeEnabled({ timeout: 6_000 });
  await answerAllCorrectly(page);

  await expect(page.getByText("Accuracy: 66%")).toBeVisible();
});

test("the race ends for the player when the engine reports a DNF", async ({ page, world }) => {
  await startRace(page, world);
  await pick(page, "Mercury");
  await expect(page.getByRole("heading", { name: "Question 2:" })).toBeVisible();

  await world.engineSend(page, "completion", { username: "E2E Player", time: "DNF" });

  await expect(page.getByRole("heading", { name: "Game Over" })).toBeVisible();
  await expect(page.getByText("Try again in the next round!")).toBeVisible();
  await expect(page.getByRole("row", { name: "1 E2E Player DNF" })).toBeVisible();
});

test("asks ten or more questions in order", async ({ page, world }) => {
  test.fail(true, "EXP-433: question keys are sorted as text, so q10 comes right after q1");
  const questions: Record<string, Question> = {};
  for (let n = 1; n <= 10; n++) {
    questions[`q${n}`] = { questionNumber: n, text: `Question text ${n}`, options: ["yes", "no"], correctIndex: 0 };
  }
  await startRace(page, world, questions);

  await pick(page, "yes");

  await expect(page.getByRole("heading", { name: "Question 2:" })).toBeVisible();
  await expect(page.getByText("Question text 2", { exact: true })).toBeVisible();
});

test("a player who finished can race again when the engine starts the next round", async ({ page, world }) => {
  test.fail(true, "EXP-433: the question index and leaderboard are never reset on a new 'start'");
  await startRace(page, world);
  await answerAllCorrectly(page);
  await expect(page.getByRole("heading", { name: "All Done!" })).toBeVisible();

  const nextRound: Record<string, Question> = {
    q1: { questionNumber: 1, text: "What colour is the sky?", options: ["Blue", "Green"], correctIndex: 0 },
  };
  await world.engineSend(page, "start", { questions: nextRound });

  await expect(page.getByText("What colour is the sky?")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Question 1:" })).toBeVisible();
});
