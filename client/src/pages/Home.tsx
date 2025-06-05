import { useContext, useEffect, useState } from "react";

// components
import { PageContainer } from "@/components";
import { MultipleChoiceQuestion } from "@/components";
import { TypeExcerpt } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";

// utils
import { backendAPI, setErrorMessage, setGameState, getVisitor } from "@/utils";
import DroppedAssetDetails from "@/components/DroppedAssetDetails";

// types
import { Question, QuestionsMap, InteractiveParams } from "@/context/types";
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

const testExcerpt = [
  "the",
  "left",
  "component",
  "orange",
  "sky",
  "topia",
  "flavor",
  "west",
  "type-script",
  "never",
  "the",
  "left",
  "component",
  "orange",
  "flavor",
  "type-script",
  "never",
  "the",
  "left",
  "component",
  "orange",
  "flavor",
  "type-script",
  "never",
  "the",
  "left",
  "component",
  "orange",
  "flavor",
  "type-script",
  "never",
];

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

  // State to track which question we’re on
  const questionIds = questions ? Object.keys(questions).sort() : [];
  const totalCount = questionIds.length;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mcqKey, setMcqKey] = useState(0);

  const [startTime] = useState(() => Date.now()); // record start time on mount

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
          },
        }),
      );

      setTimeout(() => {
        setCurrentQuestionIndex((i) => i + 1);
      }, 500);
    } else {
      setTimeout(() => {
        setMcqKey((k) => k + 1);
      }, 4000);
    }
  };

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

  // Temporary what we return on completion
  if (!isLoading && currentQuestionIndex >= totalCount) {
    const elapsedMs = Date.now() - startTime;
    const seconds = Math.round(elapsedMs / 1000);
    const accuracy = Math.round((correctCount / totalCount) * 100);

    return (
      <PageContainer isLoading={false} headerText="Skill Sail Race">
        <div className="rtsdk p-6 text-center">
          <h2 className="h2">All Done!</h2>
          <p className="p1">Great job, you’ve answered all {totalCount} questions.</p>

          <div className="mt-6">
            <p className="p2">
              <strong>Accuracy:</strong> {correctCount} / {totalCount} ({accuracy}%)
            </p>
            <p className="p2">
              <strong>Time:</strong> {seconds} second{seconds !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
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
