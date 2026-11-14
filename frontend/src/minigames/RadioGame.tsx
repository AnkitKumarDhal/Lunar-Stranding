// frontend/src/minigames/RadioGame.tsx
import { useState } from "react";
import {
  gameApi,
  type SignalMatchResponse,
  type SignalTransmissionResponse,
} from "@/services/api";

export const RadioGame = () => {
  const [activeTab, setActiveTab] = useState<"match" | "transmission">("match");

  // Rabin-Karp Signal Matching State
  const [signalInput, setSignalInput] = useState("1101001011010010");
  const [patternInput, setPatternInput] = useState("010110");
  const [matchResult, setMatchResult] = useState<SignalMatchResponse | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  // Huffman Signal Transmission State
  const [textInput, setTextInput] = useState("LUNAR BASE EMERGENCY COMMS ESTABLISHED");
  const [transResult, setTransResult] = useState<SignalTransmissionResponse | null>(null);
  const [transLoading, setTransLoading] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);

  // --- Handlers ---
  const handleMatchSubmit = async () => {
    setMatchLoading(true);
    setMatchError(null);
    try {
      const res = await gameApi.submitSignalMatch(signalInput, patternInput);
      setMatchResult(res);
    } catch (err: unknown) {
      setMatchError(err instanceof Error ? err.message : "Signal matching failed");
    } finally {
      setMatchLoading(false);
    }
  };

  const handleTransSubmit = async () => {
    setTransLoading(true);
    setTransError(null);
    try {
      const res = await gameApi.submitSignalTransmission(textInput);
      setTransResult(res);
    } catch (err: unknown) {
      setTransError(err instanceof Error ? err.message : "Compression failed");
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
          onClick={() => setActiveTab("transmission")}
          className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider transition-colors cursor-pointer ${
            activeTab === "transmission"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          2. SIGNAL TRANSMISSION (HUFFMAN)
        </button>
      </div>

      {/* TAB 1: RABIN-KARP SIGNAL MATCHING */}
      {activeTab === "match" && (
        <div className="flex flex-col space-y-4">
          <div className="text-xs text-slate-400">
            <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Search a high-speed telemetry carrier bitstream for a mission pattern using Rabin-Karp rolling-hash matching.
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
                onChange={(e) => setSignalInput(e.target.value.replace(/[^01]/g, ""))}
                placeholder="e.g. 11010010110"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 tracking-widest"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block font-mono mb-1">
                TARGET TELEMETRY PATTERN (BINARY):
              </label>
              <input
                type="text"
                value={patternInput}
                onChange={(e) => setPatternInput(e.target.value.replace(/[^01]/g, ""))}
                placeholder="e.g. 010110"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 tracking-widest"
              />
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
              Signal: {signalInput.length} bits | Pattern: {patternInput.length} bits
            </span>
            <button
              onClick={handleMatchSubmit}
              disabled={matchLoading || !signalInput || !patternInput}
              className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {matchLoading ? "SCANNING ROLLING HASH..." : "SCAN CARRIER SIGNAL"}
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
                    Match Bit Offset: <span className="text-amber-400 font-bold">{matchResult.match_index}</span>
                  </span>
                )}
              </div>
              <p className="text-slate-200">{matchResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HUFFMAN SIGNAL TRANSMISSION */}
      {activeTab === "transmission" && (
        <div className="flex flex-col space-y-4">
          <div className="text-xs text-slate-400">
            <span className="text-cyan-400 font-bold">OBJECTIVE:</span> Compress lunar outbound telemetry payload into variable-length binary prefix codes using Huffman coding.
          </div>

          {/* Text Input Block */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 block font-mono mb-1">
                TELEMETRY PAYLOAD (PLAINTEXT):
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={2}
                placeholder="Enter transmission text..."
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded border border-slate-800">
            <span className="text-xs text-slate-400 font-mono">
              Payload Length: <span className="text-cyan-400 font-bold">{textInput.length} chars</span> ({(textInput.length * 8)} bits ASCII)
            </span>
            <button
              onClick={handleTransSubmit}
              disabled={transLoading || textInput.length === 0}
              className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-xs font-bold rounded tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {transLoading ? "ENCODING HUFFMAN TREE..." : "ENCODE & COMPRESS"}
            </button>
          </div>

          {transError && (
            <div className="text-xs text-rose-400 p-2 border border-rose-500/40 bg-rose-950/40 rounded">
              {transError}
            </div>
          )}

          {transResult && (
            <div className="text-xs p-3 border border-slate-700 bg-slate-900/95 rounded space-y-3">
              <div className="flex items-center justify-between">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold px-2 py-0.5 rounded text-[10px] tracking-wider">
                  STATUS: {transResult.status}
                </span>
                <span className="text-slate-400 font-mono">
                  Data Reduction: <span className="text-emerald-400 font-bold">{transResult.compression_ratio_percentage}%</span>
                </span>
              </div>

              <p className="text-slate-200">{transResult.message}</p>

              {/* Compression Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-2 border-y border-slate-800 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block">Original (8-bit ASCII):</span>
                  <span className="text-amber-400 font-bold">{transResult.original_length_bits} bits</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Compressed Signal:</span>
                  <span className="text-emerald-400 font-bold">{transResult.encoded_length_bits} bits</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reduction Ratio:</span>
                  <span className="text-cyan-400 font-bold">{transResult.compression_ratio_percentage}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Lossless Round-Trip:</span>
                  <span className={`font-bold ${transResult.is_valid ? "text-emerald-400" : "text-rose-400"}`}>
                    {transResult.is_valid ? "VERIFIED" : "FAILED"}
                  </span>
                </div>
              </div>

              {/* Huffman Code Mapping Badges */}
              <div>
                <span className="text-[10px] text-slate-500 block mb-1 font-mono uppercase">
                  Huffman Binary Prefix Codes:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {Object.entries(transResult.code_map).map(([char, code]) => (
                    <span
                      key={char}
                      className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[11px]"
                    >
                      <span className="text-amber-300 font-bold">{char === " " ? "SPACE" : char}</span>
                      <span className="text-slate-500 mx-1">:</span>
                      <span className="text-cyan-400 font-semibold">{code}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Encoded Binary String */}
              <div>
                <span className="text-[10px] text-slate-500 block mb-1 font-mono uppercase">
                  Encoded Binary Output:
                </span>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-cyan-300 break-all select-all text-[11px] max-h-20 overflow-y-auto">
                  {transResult.encoded_signal}
                </div>
              </div>

              {/* Decoded Text Check */}
              <div className="text-[11px] font-mono text-slate-400 pt-1">
                Decoded Output: <span className="text-slate-200 font-semibold">{transResult.decoded_text}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
