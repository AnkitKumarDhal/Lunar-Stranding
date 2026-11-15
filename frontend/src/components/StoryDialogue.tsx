import type { StoryChoice, StoryLine } from "../story/storyFlow";

interface StoryDialogueProps {
  day: number;
  line: StoryLine;
  onContinue: () => void;
  choices?: StoryChoice[];
  onChoose?: (choiceId: string) => void;
}

export function StoryDialogue({
  day,
  line,
  onContinue,
  choices,
  onChoose,
}: StoryDialogueProps) {
  const aiSpeaking = line.speaker === "AI";
  const commanderSpeaking = line.speaker === "COMMANDER";

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#03070d] font-mono text-slate-100">
      <div className="absolute inset-0 bg-[url('/moon.png')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/15 via-slate-950/25 to-slate-950" />

      <div className="absolute left-6 top-6 z-10 border border-cyan-500/40 bg-slate-950/75 px-4 py-2 backdrop-blur">
        <p className="text-[10px] tracking-[0.28em] text-cyan-400">
          LUNAR STRANDING
        </p>
        <p className="mt-1 text-xs font-bold tracking-widest text-white">
          DAY {String(day).padStart(2, "0")}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-[29%] top-0">
        <div className="absolute bottom-0 left-[4vw] flex h-[92%] w-[42vw] items-end justify-center">
          <img
            src="/characters/ai-placeholder.svg"
            alt="AI companion"
            className={`h-full max-h-full w-full object-contain object-bottom transition-all duration-300 ${
              aiSpeaking
                ? "opacity-100 drop-shadow-[0_0_35px_rgba(34,211,238,0.22)]"
                : "opacity-55"
            }`}
          />
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 border border-cyan-500/35 bg-slate-950/75 px-3 py-1 text-[9px] tracking-[0.2em] text-cyan-300">
            AI COMPANION
          </span>
        </div>

        <div className="absolute bottom-0 right-[4vw] flex h-[92%] w-[42vw] items-end justify-center">
          <img
            src="/characters/commander-placeholder.svg"
            alt="Commander"
            className={`h-full max-h-full w-full object-contain object-bottom transition-all duration-300 ${
              commanderSpeaking
                ? "opacity-100 drop-shadow-[0_0_35px_rgba(251,191,36,0.2)]"
                : "opacity-65"
            }`}
          />
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 border border-amber-500/35 bg-slate-950/75 px-3 py-1 text-[9px] tracking-[0.2em] text-amber-300">
            COMMANDER
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-cyan-700/60 bg-slate-950/95 px-5 pb-5 pt-4 shadow-[0_-18px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:px-10 sm:pb-7">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span
              className={`text-[10px] font-bold tracking-[0.25em] ${
                line.speaker === "SYSTEM" ? "text-amber-300" : "text-cyan-300"
              }`}
            >
              {line.speaker === "SYSTEM"
                ? "BASE SYSTEM"
                : line.speaker === "AI"
                  ? "AI COMPANION"
                  : "COMMANDER"}
            </span>

            <span className="text-[9px] tracking-widest text-slate-500">
              ARTEMIS // SOUTH POLE OUTPOST
            </span>
          </div>

          <p className="min-h-[3.8rem] whitespace-pre-wrap text-sm leading-7 text-slate-100 sm:text-base sm:leading-8">
            {line.text}
          </p>

          {choices && choices.length > 0 ? (
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChoose?.(choice.id)}
                  className="border border-cyan-500/60 bg-cyan-950/50 px-4 py-3 text-[10px] font-bold tracking-widest text-cyan-200 transition-colors hover:border-cyan-300 hover:bg-cyan-900/60"
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onContinue}
                className="flex items-center gap-3 border border-cyan-400/70 bg-cyan-500/15 px-5 py-2.5 text-[10px] font-bold tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-500/25"
              >
                CONTINUE <span aria-hidden="true">›</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
