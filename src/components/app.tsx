import { useState, useEffect } from "react";
import type { GameState } from "@/lib/game";
import { Game } from "@/components/game";
import { getInitialState } from "@/lib/game";

const DEBUG = import.meta.env.VITE_DEBUG === "true";

export function App() {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    setState(getInitialState(DEBUG));
  }, []);

  if (!state) return null;

  return <Game initialState={state} />;
}
