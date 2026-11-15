// frontend/src/minigames/RadioGame.tsx
import { useCallback, useEffect, useState } from "react";
import {
  gameApi,
  type SignalMatchChallenge,
  type SignalMatchResponse,
  type SignalTransmissionChallenge,
  type SignalTransmissionResult,
} from "@/services/api";

export const RadioGame = () => {
  const [activeTab, setActiveTab] = useState<"match" | "transmission">("match");

  // Rabin-Karp sliding-window challenge state
  const [matchChallenge, setMatchChallenge] = useState<SignalMatchChallenge | null>(null);
  const [windowStart, setWindowStart] = useState(0);
  const [matchResult, setMatchResult] = useState<SignalMatchResponse | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Huffman decoding state
  const [transChallenge, setTransChallenge] = useState<SignalTransmissionChallenge | null>(null);
  const [transAnswer, setTransAnswer] = useState("");
  const [transResult, setTransResult] = useState<SignalTransmissionResult | null>(null);
  const [transLoading, setTransLoading] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);
  const isAnswerInvalid = /[^A-Z ]/.test(transAnswer);

  // Load a fresh signal and reset the highlighted window.
  const loadSignalChallenge = useCallback(async () => {
    setMatchLoading(true);
    setMatchError(null);
    setMatchResult(null);
    try {
      setMatchChallenge(await gameApi.newSignalMatch());
      setWindowStart(0);
    } catch (err: unknown) {
      setMatchError(err instanceof Error ? err.message : "Could not load a signal");
    } finally {
      setMatchLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSignalChallenge();
  }, [loadSignalChallenge]);

  const moveWindow = (step: number) => {
    if (!matchChallenge) return;
    setWindowStart((current) => current + step);
    setMatchResult(null);
  };

  const handleMatchSubmit = async () => {
    if (!matchChallenge) return;
    setMatchLoading(true);
    setMatchError(null);
    try {
      setMatchResult(await gameApi.submitSignalMatch(matchChallenge, windowStart));
    } catch (err: unknown) {
      setMatchError(err instanceof Error ? err.message : "Signal check failed");
    } finally {
      setMatchLoading(false);
    }
  };

  const handleNewTransmission = async () => {
    setTransLoading(true);
    setTransError(null);
    setTransResult(null);
    try {
      setTransChallenge(await gameApi.newSignalTransmission());
      setTransAnswer("");
    } catch (err: unknown) {
      setTransError(err instanceof Error ? err.message : "Could not load a transmission");
    } finally {
      setTransLoading(false);
    }
  };

  const handleTransSubmit = async () => {
    if (!transChallenge) return;
    setTransLoading(true);
    setTransError(null);
    try {
      setTransResult(await gameApi.submitSignalTransmission(transChallenge, transAnswer));
    } catch (err: unknown) {
      setTransError(err instanceof Error ? err.message : "Could not decode the transmission");
    } finally {
      setTransLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Sub-Facility Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("match")}
          className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors cursor-pointer ${
            activeTab === "match"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          1. SIGNAL MATCHING (RABIN-KARP)
        </button>
        <button
          onClick={() => {
            setActiveTab("transmission");
            if (!transChallenge && !transLoading) void handleNewTransmission();
          }}
          className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors cursor-pointer ${
            activeTab === "transmission"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          2. SIGNAL DECODING (HUFFMAN)
        </button>
      </div>

      {/* TAB 1: RABIN-KARP SIGNAL MATCHING */}
      {activeTab === "match" && (
        <div className="flex flex-col space-y-3">
          <p className="text-xs text-slate-400">
            <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Find the target bits in the larger signal. Move the highlighted window one bit at a time.
          </p>

          {matchError && (
            <p className="text-xs text-rose-400 p-2 border border-rose-500/40 rounded">{matchError}</p>
          )}

          {matchChallenge ? (
            <>
              <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-3 space-y-2">
                <span className="text-[10px] text-slate-400 font-mono">TARGET PATTERN</span>
                <div className="font-mono text-lg tracking-[0.25em] text-amber-300 bg-slate-950 border border-amber-500/40 rounded p-2 text-center">
                  {matchChallenge.pattern}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>RECEIVED BINARY SIGNAL</span>
                  <span>{matchChallenge.signal.length} BITS</span>
                </div>
                <div className="grid grid-cols-10 sm:grid-cols-16 gap-1">
                  {matchChallenge.signal.split("").map((bit, index) => {
                    const highlighted = index >= windowStart && index < windowStart + matchChallenge.pattern.length;
                    return (
                      <span
                        key={index}
                        className={`text-center rounded py-1 font-mono text-xs ${
                          highlighted
                            ? "bg-amber-400 text-slate-950 font-bold animate-pulse"
                            : "bg-slate-950 text-slate-300 border border-slate-800"
                        }`}
                      >
                        {bit}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded p-2">
                <button
                  onClick={() => moveWindow(-1)}
                  disabled={matchLoading || windowStart === 0 || matchResult?.pattern_found}
                  aria-label="Move highlighted window left"
                  className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-cyan-300 text-lg disabled:opacity-30"
                >
                  ←
                </button>
                <div className="flex-1 text-center min-w-0">
                  <div className="text-[10px] text-slate-500 font-mono">HIGHLIGHTED WINDOW</div>
                  <div className="font-mono tracking-[0.2em] text-amber-300 text-sm animate-pulse">
                    {matchChallenge.signal.slice(windowStart, windowStart + matchChallenge.pattern.length)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    POSITION {windowStart + 1} / {matchChallenge.signal.length - matchChallenge.pattern.length + 1}
                  </div>
                </div>
                <button
                  onClick={() => moveWindow(1)}
                  disabled={matchLoading || windowStart >= matchChallenge.signal.length - matchChallenge.pattern.length || matchResult?.pattern_found}
                  aria-label="Move highlighted window right"
                  className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-cyan-300 text-lg disabled:opacity-30"
                >
                  →
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 bg-slate-900/60 border border-slate-800 rounded p-2">
                <button
                  onClick={() => void loadSignalChallenge()}
                  disabled={matchLoading}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-600 text-slate-200 text-xs font-bold rounded disabled:opacity-40"
                >
                  NEW SIGNAL
                </button>
                <button
                  onClick={() => void handleMatchSubmit()}
                  disabled={matchLoading || matchResult?.pattern_found}
                  className="px-4 py-1.5 bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold rounded disabled:opacity-40"
                >
                  {matchLoading ? "CHECKING..." : "SUBMIT WINDOW"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-cyan-300 font-mono">{matchLoading ? "Receiving signal..." : "No signal loaded."}</p>
          )}

          {matchResult && (
            <div className={`text-xs p-3 border rounded ${matchResult.pattern_found ? "border-emerald-500/40 bg-emerald-950/20" : "border-amber-500/40 bg-amber-950/20"}`}>
              <span className={`font-bold ${matchResult.pattern_found ? "text-emerald-400" : "text-amber-300"}`}>
                STATUS: {matchResult.status}
              </span>
              <p className="text-slate-200 mt-1">{matchResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HUFFMAN SIGNAL DECODING */}
      {activeTab === "transmission" && (
        <div className="flex flex-col space-y-4">
          <div className="text-xs text-slate-400">
            <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Decode the binary message using the character-code table.
          </div>

          {transError && (
            <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">
              {transError}
            </div>
          )}

          {transChallenge && (
            <>
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">
                    CHARACTER : HUFFMAN CODE
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(transChallenge.code_map).map(([char, code]) => (
                      <span key={char} className="px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-[11px]">
                        <span className="text-amber-300 font-bold">{char === " " ? "SPACE" : char}</span>
                        <span className="text-slate-500 mx-1">:</span>
                        <span className="text-cyan-300 font-semibold">{code}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">
                    ENCODED BINARY MESSAGE
                  </span>
                  <div className="bg-slate-950 p-3 rounded border border-slate-700 font-mono text-cyan-300 text-xs leading-relaxed break-all max-h-28 overflow-y-auto select-all">
                    {transChallenge.encoded_signal}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 space-y-2">
                <label className="text-[11px] text-slate-400 block font-mono">
                  DECODED MESSAGE (A-Z AND SPACES):
                </label>
                <textarea
                  value={transAnswer}
                  onChange={(e) => setTransAnswer(e.target.value.toUpperCase())}
                  rows={2}
                  placeholder="Type the decoded message..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                {isAnswerInvalid && (
                  <p className="text-[10px] text-rose-400">Only capital letters A-Z and spaces are allowed.</p>
                )}
              </div>

              <div className="flex flex-wrap justify-between gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <button
                  onClick={() => void handleNewTransmission()}
                  disabled={transLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded disabled:opacity-40"
                >
                  NEW TRANSMISSION
                </button>
                <button
                  onClick={() => void handleTransSubmit()}
                  disabled={transLoading || !transAnswer.trim() || isAnswerInvalid}
                  className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {transLoading ? "CHECKING..." : "DECODE MESSAGE"}
                </button>
              </div>
            </>
          )}

          {transResult && (
            <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-2">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                transResult.is_correct
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}>
                STATUS: {transResult.status}
              </span>
              <p className="text-slate-200">{transResult.message}</p>
              <p className="font-mono text-slate-400">
                Correct message: <span className="text-cyan-300 font-bold">{transResult.correct_answer}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
