import { useContext, useEffect, useState } from "react";

// components
import { PageContainer } from "@/components";
import { MultipleChoiceQuestion } from "@/components";
import { TypeExcerpt } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import DroppedAssetDetails from "@/components/DroppedAssetDetails";

type Question = {
  questionNumber: number;
  text: string;
  options: string[];
  correctIndex: number;
};

type QuestionsMap = Record<string, Question>;

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
  const { hasInteractiveParams } = useContext(GlobalStateContext);

  const [isLoading, setIsLoading] = useState(true);

  // State to track which question we’re on
  const questionIds = Object.keys(testData.questions).sort();
  const totalCount = questionIds.length;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(() => Date.now()); // record start time on mount

  const handleAnswer = (isCorrect: boolean) => {
    console.log("Answer was correct?", isCorrect);
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setTimeout(() => {
        setCurrentQuestionIndex((i) => i + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state")
        .then((response) => {
          setGameState(dispatch, response.data);
        })
        .catch((error) => setErrorMessage(dispatch, error))
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [hasInteractiveParams]);

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

  // Current question data here
  const currentId = questionIds[currentQuestionIndex];
  const { questionNumber, text, options } = testData.questions[currentId];

  return (
<<<<<<< Updated upstream
    <PageContainer isLoading={isLoading} headerText="Server side example using interactive parameters">
      <DroppedAssetDetails />
=======
    <PageContainer isLoading={isLoading} headerText="Skill Sail Race">
      {/* <DroppedAssetDetails /> */}
      {/* <MultipleChoiceQuestion
        key={currentId}
        questionId={currentId}
        questionNumber={questionNumber}
        questionText={text}
        options={options}
        onAnswer={handleAnswer}
      /> */}
      <TypeExcerpt words={testExcerpt} />
>>>>>>> Stashed changes
    </PageContainer>
  );
};

export default Home;
