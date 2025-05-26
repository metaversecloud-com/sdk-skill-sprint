import React, { useState, useRef, useEffect } from "react";

interface TypeExcerptProps {
  words: string[];
}

export const TypeExcerpt = ({ words }: TypeExcerptProps) => {
  const excerpt = words.join(" ");
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // handle key presses
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const nextIndex = value.length;
    const expectedChar = excerpt[nextIndex] || "";

    // always block backspace
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      return;
    }

    // if it's a single character (length === 1),
    // compare to the excerpt at the next position
    if (e.key.length === 1) {
      if (e.key === expectedChar) {
        // let it through *invisibly*: we update state ourselves
        setValue((v) => v + e.key);
      }
      // in all cases prevent the browser from inserting it
      e.preventDefault();
    }

    // let Tab, Shift, etc. behave normally if you want
  };

  return (
    <div>
      <h4 className="h4 mb-2 pb-2">Type this excerpt as fast as possible!</h4>
      <div
        className="rtsdk relative overflow-hidden"
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          width: "100%",
          height: "200px",
        }}
      >
        {/* Ghost background text with the same p1 formatting */}
        <div
          aria-hidden="true"
          className="p1 pointer-events-none absolute inset-0"
          style={{
            color: "rgba(82, 70, 70, 0.63)",
            WebkitTextStroke: "0px #000",
            padding: "8px",
            boxSizing: "border-box",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            // match p1 exactly (Open Sans, 16px, 140%, .08px)
            fontFamily: `"Open Sans"`,
            fontSize: "16px",
            lineHeight: "140%",
            letterSpacing: "0.08px",
          }}
        >
          {excerpt}
        </div>

        {/* Transparent textarea overlay, also p1 for identical text metrics */}
        <textarea
          ref={textareaRef}
          value={value}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="absolute inset-0 input p1 bg-transparent text-success"
          style={{
            color: "green",
            border: "none",
            padding: "8px",
            boxSizing: "border-box",
            resize: "none",
            outline: "none",
            background: "transparent",
            // caretColor: "transparent",
          }}
        />
      </div>
    </div>
  );
};

export default TypeExcerpt;
