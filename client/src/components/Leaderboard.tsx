import { PlayerRecord } from "@/context/types";

export interface LeaderboardProps {
  players: PlayerRecord[];
  maxPlayers?: number;
}

const formatTime = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const truncate = (s: string, n = 16) => (s.length > n ? s.slice(0, n) + "…" : s);

export const Leaderboard = ({ players, maxPlayers = 8 }: LeaderboardProps) => {
  // sort by time and take top #
  const topPlayers = [...players]
    .sort((a, b) => {
      if (a.time === "DNF" && b.time === "DNF") return 0;
      if (a.time === "DNF") return 1;
      if (b.time === "DNF") return -1;
      // both have to be nums now:
      return (a.time as number) - (b.time as number);
    })
    .slice(0, maxPlayers);

  return (
    <div className="rtsdk card p-6">
      <h2 className="h2 text-center mb-4">Leaderboard</h2>
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="p-2 p3 text-left">Rank</th>
            <th className="p-2 p3 text-left">Player</th>
            <th className="p-2 p3 text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {topPlayers.map((p, idx) => {
            const timeDisplay = p.time === "DNF" ? "DNF" : formatTime(p.time as number);
            return (
              <tr key={p.username} className="border-t">
                <td className="p-2 p3">{idx + 1}</td>
                <td className="p-2 p3">{truncate(p.username)}</td>
                <td className="p-2 p3">{timeDisplay}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
