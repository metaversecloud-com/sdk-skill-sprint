import { useState, useEffect } from "react";

export interface CountdownProps {
  timeLeft: number;
  numLoaded: number;
  totalPlayers: number;
}

export const Countdown = ({ timeLeft, numLoaded, totalPlayers }: CountdownProps) => {
  // internal state for the ticking display
  const [count, setCount] = useState(timeLeft);

  // whenever the prop changes, reset our counter
  useEffect(() => {
    setCount(timeLeft);
    // start a new interval
    const id = setInterval(() => {
      setCount((current) => {
        return current - 1;
      });
    }, 1000);

    // cleanup on unmount or prop change
    return () => clearInterval(id);
  }, [timeLeft]);

  return (
    <div className="rtsdk p-6 text-center">
      <h2 className="h2">{count > -1 ? `The game will begin in ${count}…` : `Waiting for ${totalPlayers - numLoaded} player(s) to load`}
      </h2>
    </div>
  );
};
