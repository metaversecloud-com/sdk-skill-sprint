import { useContext, useEffect, useState } from "react";

// components
import { PageContainer } from "@/components";
import { MultipleChoiceQuestion } from "@/components";
import { TypeExcerpt } from "@/components";
import { Leaderboard } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";

// utils
import { backendAPI, setErrorMessage, setGameState, getVisitor } from "@/utils";
import DroppedAssetDetails from "@/components/DroppedAssetDetails";

// types
import { Question, QuestionsMap, InteractiveParams, PlayerRecord } from "@/context/types";
import type SimplePeer from "simple-peer";
import { profile } from "console";

const testData: { questions: QuestionsMap } = {
  questions: {
    q1: {
      questionNumber: 1,
      text: "What planet is closest to the Sun?",
      options: ["Earth", "Mercury", "Venus", "Mars"],
      correctIndex: 1,
    },
    q2: {
      questionNumber: 2,
      text: "Which planet is known as the Red Planet?",
      options: ["Earth", "Mars", "Jupiter", "Venus"],
      correctIndex: 1,
    },
    q3: {
      questionNumber: 3,
      text: "What is 2 + 2?",
      options: ["1", "2", "3", "4"],
      correctIndex: 3,
    },
  },
};

const testExcerpt = ["the", "left", "component", "orange", "sky", "topia", "next"];

const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const {
    hasInteractiveParams,
    visitorId,
    gameEngineId,
    gameStarted,
    questions,
    visitor: peer,
  } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<PlayerRecord[]>([]);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [joinedLate, setJoinedLate] = useState(false);

  // State to track which question we’re on
  const questionIds = questions ? Object.keys(questions).sort() : [];
  const totalCount = questionIds.length;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mcqKey, setMcqKey] = useState(0);

  const [startTime, setStartTime] = useState<number | null>(null);

  let currentId: string | null = null;
  let q: Question | null = null;

  if (totalCount > 0 && currentQuestionIndex < totalCount) {
    currentId = questionIds[currentQuestionIndex];
    q = questions![currentId];
  }

  const handleAnswer = (isCorrect: boolean) => {
    if (!peer) {
      console.warn("No peer available to send message.");
      return;
    }
    console.log("Answer was correct?: ", isCorrect);

    if (isCorrect) {
      setCorrectCount((c) => c + 1);

      // Let the engine know we got the question right
      peer.send(
        JSON.stringify({
          eventId: "fromIframe",
          gameEngineId,
          payload: {
            type: "answer",
            playerId: visitorId,
            questionId: currentQuestionIndex,
            time: Date.now() - startTime!,
          },
        }),
      );

      setTimeout(() => {
        setCurrentQuestionIndex((i) => i + 1);
      }, 500);
    } else {
      setTimeout(() => {
        setCorrectCount((c) => c - 1);
        setMcqKey((k) => k + 1);
      }, 4000);
    }
  };

  // listen for completion events
  useEffect(() => {
    if (!peer) return;

    const handleData = (raw: any) => {
      let msg: any;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      const { type, payload: inner } = msg.payload;
      if (type === "completion") {
        const { username, time } = inner as {
          username: string;
          time: number | "DNF";
        };

        setLeaderboard((prev) => {
          if (prev.some((p) => p.username === username)) return prev;
          return [...prev, { username, time }];
        });
      } else if (type === "gameStartedOnConnect") {
        // if the engine signals “game already started” on connect
        console.log("Joined late!");
        setJoinedLate(true);
      }
    };

    peer.on("data", handleData);
    return () => {
      peer.off("data", handleData);
    };
  }, [peer]);

  useEffect(() => {
    if (hasInteractiveParams) {
      setIsLoading(true);
    }
  }, [hasInteractiveParams]);

  useEffect(() => {
    if (gameStarted && questions) {
      setIsLoading(false);
    }
  }, [gameStarted, questions]);

  useEffect(() => {
    if (!isLoading && startTime === null) {
      setStartTime(Date.now());
    }
  }, [isLoading, startTime]);

  useEffect(() => {
    if (!isLoading && currentQuestionIndex >= totalCount && startTime !== null && completionTime === null) {
      setCompletionTime(Date.now() - startTime);
    }
  }, [isLoading, currentQuestionIndex, totalCount, startTime, completionTime]);

  // Temporary what we return on completion
  if (!isLoading && currentQuestionIndex >= totalCount) {
    if (completionTime === null) return null;
    const seconds = Math.floor(completionTime / 1000);
    const accuracy = Math.max(0, Math.floor((correctCount / totalCount) * 100));

    return (
      <PageContainer isLoading={false} headerText="Skill Sail Race">
        <div className="rtsdk p-6 text-center">
          <h2 className="h2">All Done!</h2>
          <p className="p1">Great job, you’ve answered all {totalCount} questions.</p>

          <div className="mt-6">
            <p className="p2">
              <strong>Accuracy:</strong> {accuracy}%
            </p>
            <p className="p2">
              <strong>Time:</strong> {seconds} second{seconds !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Leaderboard players={leaderboard} />
      </PageContainer>
    );
  }

  // Show a final screen if the game is over (received a DNF) but never if we've actually finished all questions.
  if (!isLoading && currentQuestionIndex < totalCount && leaderboard.some((p) => p.time === "DNF")) {
    return (
      <PageContainer isLoading={false} headerText="Skill Sail Race">
        <div className="rtsdk p-6 text-center">
          <h2 className="h2">Game Over</h2>
          <p className="p1">Try again in the next round!</p>
        </div>
        <Leaderboard players={leaderboard} />
      </PageContainer>
    );
  }

  // If we joined late, show a special message (but only mid-game)
  if (joinedLate) {
    return (
      <PageContainer isLoading={false} headerText="Skill Sail Race">
        <div className="rtsdk p-6 text-center">
          <h2 className="h2">You Joined Late</h2>
          <p className="p1">Try joining in after this game is over!</p>
        </div>
        <Leaderboard players={leaderboard} />
      </PageContainer>
    );
  }

  return (
    <PageContainer isLoading={isLoading} headerText="Skill Sail Race">
      {!isLoading && q && currentId && (
        <MultipleChoiceQuestion
          key={`${currentId}-${mcqKey}`}
          questionId={currentId}
          questionNumber={q.questionNumber}
          questionText={q.text}
          options={q.options}
          correctIndex={q.correctIndex}
          onAnswer={handleAnswer}
        />
      )}
    </PageContainer>
  );
};

export default Home;
