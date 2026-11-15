import { useCallback, useEffect, useState } from "react";
import {
  gameApi,
  type SignalMatchResponse,
  type SignalTransmissionChallenge,
  type SignalTransmissionResult,
} from "@/services/api";

interface RadioGameProps {
  initialTab?: "match" | "transmission";
  lockedTab?: boolean;
  onMatchComplete?: (matched: boolean) => void;
  onTransmissionComplete?: (decoded: boolean) => void;
}

export const RadioGame = ({
  initialTab = "match",
  lockedTab = false,
  onMatchComplete,
  onTransmissionComplete,
}: RadioGameProps) => {
  const [activeTab, setActiveTab] = useState<"match" | "transmission">(
    initialTab,
  );

  // Rabin-Karp Signal Matching State
  const [signalInput, setSignalInput] = useState("1101001011010010");
  const [patternInput, setPatternInput] = useState("010110");
  const [matchResult, setMatchResult] = useState<SignalMatchResponse | null>(
    null,
  );
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Validation flags for binary inputs (only 0 and 1 allowed)
  const isSignalInvalid = Boolean(signalInput && /[^01]/.test(signalInput));
  const isPatternInvalid = Boolean(patternInput && /[^01]/.test(patternInput));

  // Huffman decoding state
  const [transChallenge, setTransChallenge] =
    useState<SignalTransmissionChallenge | null>(null);
  const [transAnswer, setTransAnswer] = useState("");
  const [transResult, setTransResult] =
    useState<SignalTransmissionResult | null>(null);
  const [transLoading, setTransLoading] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);
  const isAnswerInvalid = /[^A-Z ]/.test(transAnswer);

  // --- Handlers ---
  const handleMatchSubmit = async () => {
    setMatchLoading(true);
    setMatchError(null);
    try {
      const res = await gameApi.submitSignalMatch(signalInput, patternInput);
      setMatchResult(res);
      onMatchComplete?.(res.pattern_found);
    } catch (err: unknown) {
      setMatchError(
        err instanceof Error ? err.message : "Signal matching failed",
      );
    } finally {
      setMatchLoading(false);
    }
  };

  const handleNewTransmission = useCallback(async () => {
    setTransLoading(true);
    setTransError(null);
    setTransResult(null);

    try {
      setTransChallenge(await gameApi.newSignalTransmission());
      setTransAnswer("");
    } catch (err: unknown) {
      setTransError(
        err instanceof Error ? err.message : "Could not load a transmission",
      );
    } finally {
      setTransLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialTab === "transmission") {
      void handleNewTransmission();
    }
  }, [initialTab, handleNewTransmission]);

  const handleTransSubmit = async () => {
    if (!transChallenge) return;
    setTransLoading(true);
    setTransError(null);
    try {
      const response = await gameApi.submitSignalTransmission(
        transChallenge,
        transAnswer,
      );

      setTransResult(response);
      onTransmissionComplete?.(response.is_correct);
    } catch (err: unknown) {
      setTransError(
        err instanceof Error
          ? err.message
          : "Could not decode the transmission",
      );
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
          disabled={lockedTab}
          className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors cursor-pointer ${
            activeTab === "match"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          1. SIGNAL MATCHING (RABIN-KARP)
        </button>
        <button
          disabled={lockedTab}
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
        <div className="flex flex-col space-y-4">
          <div className="text-xs text-slate-400">
            <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Search a
            high-speed telemetry carrier bitstream for a mission pattern using
            Rabin-Karp rolling-hash matching.
          </div>

          {/* Input Controls */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 block font-mono mb-1">
                CARRIER SIGNAL STREAM (BINARY):
              </label>
              <input
                type="text"
                value={signalInput}
                onChange={(e) => setSignalInput(e.target.value)}
                placeholder="e.g. 11010010110"
                className={`w-full bg-slate-950 border ${isSignalInvalid ? "border-rose-500" : "border-slate-700"} rounded px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 tracking-widest`}
              />
              {isSignalInvalid && (
                <span className="text-[10px] text-rose-400 font-mono mt-1 block">
                  Only 0 and 1 are allowed.
                </span>
              )}
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block font-mono mb-1">
                TARGET TELEMETRY PATTERN (BINARY):
              </label>
              <input
                type="text"
                value={patternInput}
                onChange={(e) => setPatternInput(e.target.value)}
                placeholder="e.g. 010110"
                className={`w-full bg-slate-950 border ${isPatternInvalid ? "border-rose-500" : "border-slate-700"} rounded px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 tracking-widest`}
              />
              {isPatternInvalid && (
                <span className="text-[10px] text-rose-400 font-mono mt-1 block">
                  Only 0 and 1 are allowed.
                </span>
              )}
            </div>

            {/* Signal Stream Visualization */}
            {signalInput && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-1 font-mono uppercase">
                  Carrier Bitstream Inspection:
                </span>
                <div className="flex flex-wrap gap-1 font-mono text-xs select-all bg-slate-950 p-2 rounded border border-slate-800">
                  {signalInput.split("").map((bit, idx) => {
                    const isMatchedBit =
                      matchResult &&
                      matchResult.pattern_found &&
                      matchResult.match_index !== -1 &&
                      idx >= matchResult.match_index &&
                      idx < matchResult.match_index + patternInput.length;

                    return (
                      <span
                        key={idx}
                        className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                          isMatchedBit
                            ? "bg-amber-500 text-slate-950 font-black animate-pulse"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {bit}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span className="text-xs text-slate-400 font-mono">
              Signal: {signalInput.length} bits | Pattern: {patternInput.length}{" "}
              bits
            </span>
            <button
              onClick={handleMatchSubmit}
              disabled={
                matchLoading ||
                !signalInput ||
                !patternInput ||
                isSignalInvalid ||
                isPatternInvalid
              }
              className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {matchLoading
                ? "SCANNING ROLLING HASH..."
                : "SCAN CARRIER SIGNAL"}
            </button>
          </div>

          {matchError && (
            <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">
              {matchError}
            </div>
          )}

          {matchResult && (
            <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] tracking-wider ${
                    matchResult.pattern_found
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  }`}
                >
                  STATUS: {matchResult.status}
                </span>
                {matchResult.pattern_found && (
                  <span className="text-slate-400 font-mono">
                    Match Bit Offset:{" "}
                    <span className="text-amber-400 font-bold">
                      {matchResult.match_index}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-slate-200">{matchResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HUFFMAN SIGNAL DECODING */}
      {activeTab === "transmission" && (
        <div className="flex flex-col space-y-4">
          <div className="text-xs text-slate-400">
            <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Decode
            the binary message using the character-code table.
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
                    {Object.entries(transChallenge.code_map).map(
                      ([char, code]) => (
                        <span
                          key={char}
                          className="px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-[11px]"
                        >
                          <span className="text-amber-300 font-bold">
                            {char === " " ? "SPACE" : char}
                          </span>
                          <span className="text-slate-500 mx-1">:</span>
                          <span className="text-cyan-300 font-semibold">
                            {code}
                          </span>
                        </span>
                      ),
                    )}
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
                  <p className="text-[10px] text-rose-400">
                    Only capital letters A-Z and spaces are allowed.
                  </p>
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
                  disabled={
                    transLoading || !transAnswer.trim() || isAnswerInvalid
                  }
                  className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {transLoading ? "CHECKING..." : "DECODE MESSAGE"}
                </button>
              </div>
            </>
          )}

          {transResult && (
            <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-2">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                  transResult.is_correct
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                }`}
              >
                STATUS: {transResult.status}
              </span>
              <p className="text-slate-200">{transResult.message}</p>
              <p className="font-mono text-slate-400">
                Correct message:{" "}
                <span className="text-cyan-300 font-bold">
                  {transResult.correct_answer}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
