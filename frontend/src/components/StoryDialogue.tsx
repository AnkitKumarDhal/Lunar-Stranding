import { useEffect, useState } from "react";
import type { StoryChoice, StoryLine } from "../story/storyFlow";

interface StoryDialogueProps {
  day: number;
  line: StoryLine;
  onContinue: () => void;
  choices?: StoryChoice[];
  onChoose?: (choiceId: string) => void;
}

// Replace this path later when the final AI character sprite is ready.
const AI_SPRITE_SRC = "/characters/ai-placeholder.svg";

export function StoryDialogue({
  day,
  line,
  onContinue,
  choices,
  onChoose,
}: StoryDialogueProps) {
  const [visibleCharacters, setVisibleCharacters] = useState(0);

  useEffect(() => {
    setVisibleCharacters(0);

    let index = 0;
    let timeoutId: number;

    const revealNextCharacter = () => {
      index += 1;
      setVisibleCharacters(index);

      if (index < line.text.length) {
        timeoutId = window.setTimeout(revealNextCharacter, 22);
      }
    };

    timeoutId = window.setTimeout(revealNextCharacter, 22);

    return () => window.clearTimeout(timeoutId);
  }, [line.text]);

  const displayedText = line.text.slice(0, visibleCharacters);
  const isTyping = visibleCharacters < line.text.length;
  const speakerLabel =
    line.speaker === "SYSTEM"
      ? "BASE SYSTEM"
      : line.speaker === "COMMANDER"
        ? "COMMANDER"
        : "AI";

  const speakerColor =
    line.speaker === "SYSTEM"
      ? "text-amber-300"
      : line.speaker === "COMMANDER"
        ? "text-amber-200"
        : "text-cyan-300";

  const skipDialogue = () => {
    if (choices?.length) {
      setVisibleCharacters(line.text.length);
      return;
    }
    onContinue();
  };

  useEffect(() => {
    if (choices?.length) return;

    const handleEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("button, input, textarea, select")
      ) return;
      event.preventDefault();
      onContinue();
    };

    window.addEventListener("keydown", handleEnter);
    return () => window.removeEventListener("keydown", handleEnter);
  }, [choices, onContinue]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Day ${day} story dialogue`}
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-slate-950/40 px-3 py-5 font-mono text-slate-100 backdrop-blur-[2px] sm:px-6 sm:py-[4vh]"
    >
      <div className="relative mb-2 w-full max-w-[1450px] border border-cyan-500/50 bg-slate-950/90 shadow-[0_0_45px_rgba(0,0,0,0.65),0_0_25px_rgba(6,182,212,0.08)] backdrop-blur-md">
        {/* Frame corners */}
        <div className="pointer-events-none absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-cyan-400" />
        <div className="pointer-events-none absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-cyan-400" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-cyan-400" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-cyan-400" />

        <div className="flex min-h-[190px] flex-col sm:min-h-[220px] sm:flex-row">
          {/* Character sprite */}
          <div className="flex shrink-0 flex-row items-center justify-center gap-4 border-b border-cyan-900/70 bg-slate-900/70 p-4 sm:w-40 sm:flex-col sm:gap-3 sm:border-b-0 sm:border-r">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden border border-cyan-500/50 bg-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.12)] sm:h-28 sm:w-28">
              <img
                src={AI_SPRITE_SRC}
                alt="AI character"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div className="text-center">
              <p className="text-[10px] font-bold tracking-[0.25em] text-cyan-300">
                {speakerLabel}
              </p>
              <p className="mt-1 text-[8px] tracking-widest text-slate-500">
                SPEAKING
              </p>
            </div>
          </div>

          {/* Dialogue area */}
          <div className="flex min-w-0 flex-1 flex-col justify-between px-5 py-5 sm:px-8 sm:py-6">
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 animate-pulse bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />

                  <span
                    className={`text-[10px] font-bold tracking-[0.25em] ${speakerColor}`}
                  >
                    {speakerLabel}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[9px] tracking-widest text-slate-500">
                  <span>ARTEMIS // SOUTH POLE OUTPOST</span>
                  <span className="text-cyan-500/70">
                    DAY {String(day).padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="min-h-[4.5rem] whitespace-pre-wrap text-sm leading-7 text-slate-100 sm:min-h-[5rem] sm:text-base sm:leading-8">
                {displayedText}
                {isTyping && (
                  <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-cyan-300 align-middle" />
                )}
              </div>
            </div>

            {/* Dialogue controls */}
            <div className="mt-5 flex min-h-10 flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <span className="text-[9px] tracking-widest text-slate-600">
                {isTyping
                  ? "INCOMING TRANSMISSION..."
                  : "TRANSMISSION COMPLETE"}
              </span>

              <div className="flex flex-wrap justify-end gap-3">
                {isTyping ? (
                  <button
                    type="button"
                    onClick={skipDialogue}
                    className="border border-slate-600/80 bg-slate-900/80 px-5 py-2.5 text-[10px] font-bold tracking-[0.2em] text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-200"
                  >
                    SKIP
                  </button>
                ) : choices && choices.length > 0 ? (
                  choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => onChoose?.(choice.id)}
                      className="border border-cyan-500/60 bg-cyan-950/50 px-5 py-2.5 text-[10px] font-bold tracking-widest text-cyan-200 transition-colors hover:border-cyan-300 hover:bg-cyan-900/60"
                    >
                      {choice.label}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={onContinue}
                    className="flex items-center gap-3 border border-cyan-400/70 bg-cyan-500/15 px-6 py-2.5 text-[10px] font-bold tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-500/25"
                  >
                    CONTINUE <span aria-hidden="true">›</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
