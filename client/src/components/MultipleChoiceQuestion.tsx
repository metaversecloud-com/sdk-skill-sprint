import { useState } from "react";
import { backendAPI } from "@/utils/backendAPI";

interface MultipleChoiceQuestionProps {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctIndex: number;
  onAnswer?: (isCorrect: boolean) => void;
}

export const MultipleChoiceQuestion = ({
  questionId,
  questionNumber,
  questionText,
  options,
  correctIndex,
  onAnswer,
}: MultipleChoiceQuestionProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");

  const handleSelect = async (index: number) => {
    if (isSubmitting || selectedIndex !== null) return;
    setSelectedIndex(index);
    setIsSubmitting(true);
    setError("");

    try {
      const correct: boolean = index === correctIndex;
      setIsCorrect(correct);
      onAnswer?.(correct);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Error checking answer");
      // allow the user to retry the q:
      setSelectedIndex(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleSelect = async (index: number) => {
  //     return true;
  // }

  return (
    <div className="rtsdk grid gap-4 p-4">
      <h4 className="h4">Question {questionNumber}:</h4>
      <p className="p1">{questionText}</p>

      <div className="grid grid-cols-1 gap-3 pt-2">
        {options.map((opt, idx) => {
          //  button style
          let btnClass = "btn";
          if (selectedIndex === idx && isCorrect === true) btnClass += " btn-success";
          if (selectedIndex === idx && isCorrect === false) btnClass += " btn-danger";

          return (
            <button
              key={idx}
              className={btnClass}
              onClick={() => handleSelect(idx)}
              disabled={selectedIndex !== null || isSubmitting}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {error && <p className="p3 text-error mt-2">{error}</p>}
      {isCorrect !== null && (
        <p className={`p2 mt-2 ${isCorrect ? "text-success" : "text-error"}`}>
          {isCorrect ? "Correct!" : "Sorry, that’s not right."}
        </p>
      )}
    </div>
  );
};

export default MultipleChoiceQuestion;
