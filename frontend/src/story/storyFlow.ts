import type { MissionOutcome } from "../types/game";

export type StorySpeaker = "AI" | "COMMANDER" | "SYSTEM";
export type StoryOutcome = MissionOutcome | null;

export interface StoryLine {
  speaker: StorySpeaker;
  text: string;
}

export type StoryMissionId =
  | "solar-panels"
  | "signal-match"
  | "signal-decode"
  | "food-production"
  | "water-rover"
  | "rover-workshop"
  | "crater-sensors"
  | "mining-navigation"
  | "sample-retrieval";

export interface StoryChoice {
  id: string;
  label: string;
}

export type StoryStep =
  | {
      type: "dialogue";
      lines: StoryLine[];
      outcomeLines?: Partial<Record<MissionOutcome, StoryLine[]>>;
      retryOn?: MissionOutcome[];
    }
  | { type: "mission"; id: StoryMissionId }
  | { type: "optional-mission"; id: StoryMissionId }
  | { type: "choice"; line: StoryLine; choices: StoryChoice[] }
  | { type: "autonomy" }
  | { type: "sandbox" };

const ai = (text: string): StoryLine => ({ speaker: "AI", text });
const system = (text: string): StoryLine => ({ speaker: "SYSTEM", text });

// Change this value to adjust the free-play interval after Days 1–4.
export const AUTONOMY_WINDOW_SECONDS = 180;

export const STORY_STEPS: Record<number, StoryStep[]> = {
  // =========================================================
  // DAY 1
  // =========================================================
  1: [
    // LAND
    {
      type: "dialogue",
      lines: [
        ai("Hey there. You're finally awake."),
        ai(
          "It seems we've crashed at the Artemis Lunar Base near the south pole of the Moon.",
        ),
        ai("We don't have much time. Quickly, get into the base."),
      ],
    },

    // SUITPORT
    {
      type: "dialogue",
      lines: [
        ai("Before you go in, you must take off your suit at the suitport."),
        ai(
          "Moon dust is sharp because there's no air or weather to smooth it down.",
        ),
        ai(
          "If you enter the base with your suit, the dust will spread and damage the interior.",
        ),
        ai("It could also get into your body and hurt you."),
      ],
    },

    // START THE BASE
    {
      type: "dialogue",
      lines: [system("BASE UNLOCKED // LIFE SUPPORT ACCESS RESTORED")],
    },

    // ECLSS
    {
      type: "dialogue",
      lines: [
        ai(
          "We're now in the ECLSS (Environmental Control and Life Support System).",
        ),
        ai("It's similar to the system on the space station you were in."),
        ai("We're lucky there's some backup power left for it to run, but..."),
        ai(
          "It's not a lot, so we'll need to restart the solar panels to produce energy and conserve the energy we have.",
        ),
      ],
    },

    // CONNECT THE BASE SOLAR PANELS
    {
      type: "dialogue",
      lines: [
        ai(
          "Unlike on Earth, these solar panels are arranged vertically because the Sun stays low on the horizon here.",
        ),
        ai(
          "But the good news is that the Sun shines here continuously for almost 90% of the year.",
        ),
        ai(
          "This grid has six panels. Connect all of them using exactly five cables and the least total cable length.",
        ),
        ai(
          "Connecting the grid uses power. A longer cable layout costs more, so try to find the minimum cost path.",
        ),
      ],
    },
    { type: "mission", id: "solar-panels" },
    {
      type: "dialogue",
      lines: [ai("The grid isn't connected yet.")],
      outcomeLines: {
        optimal: [
          ai(
            "Wow, you're so good at this! All six panels are connected using the shortest cable layout. That saved us power.",
          ),
        ],
        suboptimal: [
          ai(
            "Yay, you did it! The panels are connected, but the cables are longer than necessary, which used some extra power.",
          ),
        ],
        invalid: [
          ai(
            "The grid isn't connected yet. We need five valid cables that link every panel without creating a loop.",
          ),
        ],
      },
      retryOn: ["invalid"],
    },

    // CONNECT BACK TO EARTH
    {
      type: "dialogue",
      lines: [
        ai(
          "Now that we have some power, let's contact Earth and ask for help.",
        ),
        ai(
          "We cannot afford to send a high-energy laser signal, so we'll use the radio.",
        ),
        ai(
          "Radio communication works by matching a known signal pattern inside the received carrier.",
        ),
        ai(
          "Let's search the carrier signal for the given pattern and establish a connection.",
        ),
      ],
    },
    { type: "mission", id: "signal-match" },
    {
      type: "dialogue",
      lines: [ai("The signal pattern matches. We have a connection to Earth.")],
      outcomeLines: {
        optimal: [
          ai("Yes! The signal pattern matches. We have a connection to Earth."),
        ],
        incorrect: [
          ai(
            "Uh-oh, that pattern doesn't match. We lost some energy. Check the signal and try again.",
          ),
        ],
      },
      retryOn: ["incorrect"],
    },

    // RECEIVE THE RESPONSE
    {
      type: "dialogue",
      lines: [
        ai("It seems they've sent their response as binary."),
        ai(
          "Binary represents information using only 0s and 1s, which makes it useful for digital transmission.",
        ),
        ai(
          "You'll be given a character-code map and an encoded binary message. Decode it to read what Earth sent.",
        ),
      ],
    },
    { type: "mission", id: "signal-decode" },
    {
      type: "dialogue",
      lines: [
        ai(
          "They received our call for help. But it will take time for rescue to arrive.",
        ),
      ],
      outcomeLines: {
        incorrect: [
          ai(
            "That doesn't make sense. The message may have been decoded incorrectly. Let's try again.",
          ),
        ],
        optimal: [
          ai(
            "They received our call for help. But it will take time for rescue to arrive.",
          ),
          ai("Space is vast. It could take a week or even longer."),
          ai(
            "You need to survive until they arrive. It's up to you to manage this base now, Chief.",
          ),
          ai("Chief? Or should I call you Commander? Commander sounds better."),
        ],
      },
      retryOn: ["incorrect"],
    },

    // DAILY CREW PROTOCOL / EXERCISE
    {
      type: "dialogue",
      lines: [
        ai(
          "Anyways, we've got a big day tomorrow, you need to be prepared and stay healthy.",
        ),
        ai(
          "The gravity on the moon is very different from Earth. It's 6 times weaker.",
        ),
        ai(
          "So you'll have to some intense exercise to maintain your body like you did in space station, otherwise it'll get weaker.",
        ),
      ],
    },

    // EAT AND SLEEP
    {
      type: "dialogue",
      lines: [
        ai("That was a good session. Let's eat and rest."),
        ai(
          "Luckily, there's food in the reserve. It's been dried to preserve it, so we need to add water before eating.",
        ),
        ai(
          "The Sun may still be shining outside, but the ECLSS can maintain a suitable environment while we rest.",
        ),
      ],
    },

    { type: "autonomy" },
  ],

  // =========================================================
  // DAY 2
  // =========================================================
  2: [
    // MORNING
    {
      type: "dialogue",
      lines: [
        ai(
          "Good morning, commander. Welcome to Day 2 of your survival mission.",
        ),
        ai(
          "We still have some food in reserve, but it could run out. We need to prepare for the days ahead.",
        ),
      ],
    },

    // FOOD PRODUCTION
    {
      type: "dialogue",
      lines: [
        ai(
          "The greenhouse grows food using scheduled systems such as LED photosynthesis, root misting and the algae bioreactor.",
        ),
        ai("Each task has a start time, an end time and a power cost."),
        ai(
          "Choose a set of maximum number of tasks that do not overlap and stay within the 5 kilowatt power limit.",
        ),
      ],
    },
    { type: "mission", id: "food-production" },
    {
      type: "dialogue",
      lines: [ai("The schedule is not safe.")],
      outcomeLines: {
        optimal: [
          ai(
            "Excellent! That schedule consists of maximum number of tasks without exceeding the power limit.",
          ),
        ],
        suboptimal: [
          ai(
            "That schedule works, but we could have conserved more power with a better combination of tasks.",
          ),
        ],
        invalid: [
          ai(
            "The schedule is not safe. Tasks must not overlap, and their combined power draw must stay within the limit.",
          ),
        ],
      },
      retryOn: ["invalid"],
    },

    // GET WATER
    {
      type: "dialogue",
      lines: [
        ai("Now we need to get water. Do you see the large crater nearby?"),
        ai("That's Shackleton Crater, near the south pole of the Moon."),
        ai(
          "It's center is very deep, you could fit 15 Eiffel tower on top of each other, that's how deep it is.",
        ),
        ai(
          "But that's why the sunlight never reaches here and it remains really cold.",
        ),
        ai("That's why it's called PSR(permanent shadow region)."),
        ai("These PSR's have ice deposits where we can collect water from."),
        ai("Let's send a rover to go collect water."),
        ai(
          "Woah, it's quite dark, even our rover with advanced AI is struggling to find a path.",
        ),
        ai(
          "Commander, find the path from Base to the Ice Deposit that uses the least energy.",
        ),
      ],
    },
    { type: "mission", id: "water-rover" },
    {
      type: "dialogue",
      lines: [ai("The rover has reached the Ice Deposit.")],
      outcomeLines: {
        optimal: [
          ai(
            "Perfect route! We reached the Ice Deposit using the least energy.",
          ),
        ],
        suboptimal: [
          ai(
            "We reached the Ice Deposit, but the route used more power than necessary.",
          ),
        ],
        invalid: [
          ai(
            "The rover hasn't reached the Ice Deposit. Check that each step follows a connected route and try again.",
          ),
        ],
      },
      retryOn: ["invalid"],
    },

    // OPTIONAL SOLAR GRID
    {
      type: "dialogue",
      lines: [
        ai(
          "Can you see those big solar grids at the top. They're built on the ridge that connects Shackleton crater and de-Garlache crater.",
        ),
        ai(
          "They're also called the Peaks of Eternal Lights, because they receive sunlight for almost 90% of the year.",
        ),
        ai(
          "That and the PSR are the major reasons this was chosen to be the location of our first moon outpost.",
        ),
        ai(
          "If you want we can try and activate that solar grid, but it'll cost a lot of energy to activate them.",
        ),
        ai(
          "But once activated they'll produce a lot of energy. The decision is yours commander.",
        ),
      ],
    },
    {
      type: "choice",
      line: ai("Would you like to activate the additional solar grid now?"),
      choices: [
        { id: "activate", label: "ACTIVATE THE SOLAR GRID" },
        { id: "skip", label: "NOT NOW — SAVE ENERGY" },
      ],
    },
    { type: "optional-mission", id: "solar-panels" },

    // EXERCISE / REST
    {
      type: "dialogue",
      lines: [
        ai(
          "Remember to keep the yourself healthy. Low-gravity exercise is important, and you should eat and rest before tomorrow.",
        ),
      ],
    },
    {
      type: "dialogue",
      lines: [ai("Congratulations on surviving Day 2, commander.")],
    },

    { type: "autonomy" },
  ],

  // =========================================================
  // DAY 3
  // =========================================================
  3: [
    // FOOD PRODUCTION
    {
      type: "dialogue",
      lines: [
        ai(
          "Good morning, commander. Let's prepare the greenhouse schedule for today.",
        ),
        ai(
          "Select non-overlapping tasks while keeping the combined power draw within the  limit.",
        ),
        ai(
          "Try to schedule maximum number of tasks as possible without overloading the system.",
        ),
      ],
    },
    { type: "mission", id: "food-production" },

    // ROVER SERVICING
    {
      type: "dialogue",
      lines: [
        ai("Commander, the water rover has been damaged by lunar dust."),
        ai(
          "We need to service it before sending it out to collect water again.",
        ),
        ai(
          "The workshop has two servicing lines. Each station takes a different amount of time, and switching lines adds transfer time.",
        ),
        ai(
          "Choose a line for every station to minimize the total servicing time. A slower schedule will consume more power.",
        ),
      ],
    },
    { type: "mission", id: "rover-workshop" },
    {
      type: "dialogue",
      lines: [ai("The rover has been serviced.")],
      outcomeLines: {
        optimal: [
          ai(
            "Excellent! The rover is serviced using the minimum time and power.",
          ),
        ],
        suboptimal: [
          ai(
            "The rover is serviced, but the schedule took longer and used more power than necessary.",
          ),
        ],
      },
    },

    // GET WATER AGAIN
    {
      type: "dialogue",
      lines: [
        ai("Let's send the rover to collect water again."),
        ai("Find the least-energy route to the Ice Deposit."),
      ],
    },
    { type: "mission", id: "water-rover" },
    {
      type: "dialogue",
      lines: [ai("The rover has returned from the Ice Deposit.")],
      outcomeLines: {
        optimal: [
          ai("Perfect! We reached the Ice Deposit using the least energy."),
        ],
        suboptimal: [
          ai(
            "We reached the Ice Deposit, but we used more power than necessary.",
          ),
        ],
      },
    },

    // ACTIVATE THE CRATER SENSORS
    {
      type: "dialogue",
      lines: [
        ai("Commander, let's activate the sensors around the base."),
        ai(
          "They will help us monitor threats such as moonquakes, solar flares and radiation.",
        ),
        ai(
          "We'll send a rover to activate each sensor. Guide it through every sensor location using the fewest movements.",
        ),
        ai("Let's avoid unnecessary loops. Every extra movement costs power."),
      ],
    },
    { type: "mission", id: "crater-sensors" },
    {
      type: "dialogue",
      lines: [ai("The crater sensors have been activated.")],
      outcomeLines: {
        optimal: [
          ai(
            "Perfect! Every sensor is active, and the rover used the minimum number of movements.",
          ),
        ],
        suboptimal: [
          ai(
            "All the sensors are active, but the rover took a longer route and used more power than necessary.",
          ),
        ],
      },
    },

    // MICRO-PARTICLE DAMAGE
    {
      type: "dialogue",
      lines: [
        ai(
          "Look at this, Commander! The sensors are detecting charged micro-particles.",
        ),
        ai(
          "They could cause damage to the base. We need to be ready to fix the damage.",
        ),
      ],
    },

    // PRESSURIZED ROVER
    {
      type: "dialogue",
      lines: [
        ai(
          "Let's get into the pressurized rover. It can serve as a mobile home while we travel across the Moon.",
        ),
        ai(
          "We'll use it to reach a mining site and collect lunar samples for the base.",
        ),
        ai(
          "It may take some time to get there, commander. Keep up your exercise routine while we travel.",
        ),
      ],
    },

    // EXERCISE, EAT AND SLEEP
    {
      type: "dialogue",
      lines: [ai("That was a good session. You should eat and rest now.")],
    },

    { type: "autonomy" },
  ],

  // =========================================================
  // DAY 4
  // =========================================================
  4: [
    // MINING NAVIGATION
    {
      type: "dialogue",
      lines: [
        ai("We're getting far from the base, and it's getting dark."),
        ai(
          "Commander, find a route to the Excavation site while keeping the net power cost as low as possible.",
        ),
        ai(
          "Some downhill routes have negative energy costs because they allow solar regeneration. Uphill routes consume power.",
        ),
      ],
    },
    { type: "mission", id: "mining-navigation" },
    {
      type: "dialogue",
      lines: [ai("The rover has reached the Excavation site.")],
      outcomeLines: {
        optimal: [
          ai(
            "Great work, commander! We managed to find the least power consuming path.",
          ),
        ],
        suboptimal: [
          ai(
            "We reached the Excavation site, but the route consumed more power. We need to watch our remaining reserve.",
          ),
        ],
      },
    },

    // SAMPLE RETRIEVAL
    {
      type: "dialogue",
      lines: [
        ai(
          "We found the lunar samples we need, but the rover cannot carry them all.",
        ),
        ai(
          "The cargo bay has a 15 kg limit. Each sample must be taken whole or left behind.",
        ),
        ai(
          "Choose the combination that gives us the most valuable samples without exceeding the cargo limit.",
        ),
      ],
    },
    { type: "mission", id: "sample-retrieval" },
    {
      type: "dialogue",
      lines: [ai("The sample loadout has been confirmed.")],
      outcomeLines: {
        optimal: [ai("Excellent selection! We got most valuable samples.")],
        suboptimal: [
          ai(
            "We got enough samples, but a better combination could have been more valuable.",
          ),
        ],
        invalid: [
          ai("The cargo is too heavy. We cannot load more than 15 kg."),
        ],
      },
      retryOn: ["invalid"],
    },

    // RETURN AND PROTECT THE BASE
    {
      type: "dialogue",
      lines: [
        ai("Let's return to the base with the samples."),
        ai(
          "These materials can be used to help protect the outpost from the micro-particle damage.",
        ),
      ],
    },

    // EXERCISE, EAT AND SLEEP
    {
      type: "dialogue",
      lines: [
        ai("Complete the exercise task, then eat and rest."),
        ai(
          "We've learned how to manage the essential systems and keep this outpost running.",
        ),
        ai(
          "Rescue may still be days away, but we're ready to take care of the base on our own, Commander.",
        ),
        ai(
          "From tomorrow, I'll assign a few operations each day. Complete them before eating and resting to move on to the next day.",
        ),
      ],
    },

    { type: "autonomy" },
  ],

  // =========================================================
  // DAY 5 — FULL AUTONOMY
  // =========================================================
  5: [
    {
      type: "dialogue",
      lines: [
        ai("From Day 5 onward, you're in full control of the base, commander."),
        ai(
          "All facilities are available. Manage the base and survive until the rescue team arrives.",
        ),
        ai(
          "Today's required mini-games are listed in Daily Operations. Complete all of them before eating and resting to continue.",
        ),
      ],
    },
    { type: "sandbox" },
  ],

  // =========================================================
  // DAYS 6–7 — SANDBOX
  // =========================================================
  6: [{ type: "sandbox" }],
  7: [{ type: "sandbox" }],
};
