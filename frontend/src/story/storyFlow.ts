export type StorySpeaker = "AI" | "COMMANDER" | "SYSTEM";
export type StoryOutcome = "success" | "failure" | null;

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
      outcomeLines?: {
        success: StoryLine[];
        failure: StoryLine[];
      };
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
  1: [
    {
      type: "dialogue",
      lines: [
        ai("Hey there. You're finally awake."),
        ai(
          "You were assigned to the Artemis south-pole mission. We were meant to bring this outpost online and prepare it for long-term operations.",
        ),
        ai(
          "Our lander was on final approach when my flight recorder lost several minutes. I can't tell you what caused the impact yet.",
        ),
        ai(
          "It seems we've crashed on the Artemis Lunar Base at the south pole of the moon.",
        ),
        ai("We don't have much time, quickly get into the base."),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai("Before you go in, you must take off your suit at the suitport."),
        ai("The moon dust is sharp since there's no air to smooth it down."),
        ai(
          "If you go into the base with your suit, the dust will spread and damage the interior badly.",
        ),
        ai("It could also get into your body and hurt you."),
      ],
    },
    {
      type: "dialogue",
      lines: [system("BASE UNLOCKED // LIFE SUPPORT ACCESS RESTORED")],
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "We're now in the ECLSS (Environmental Control and Life Support System).",
        ),
        ai("It's similar to the space station you were in."),
        ai("We're lucky there's some backup power left for it to run, but..."),
        ai(
          "It's not a lot, so we'll need to restart the solar panels to produce energy.",
        ),
        ai(
          "Unlike at Earth, the solar panels here are vertical, since at the south pole the sun shines at a really low angle.",
        ),
        ai(
          "But the good news is that the Sun shines on here continuously for almost 90% of the year.",
        ),
        ai("Ok then let's connect the solar panels."),
      ],
    },
    { type: "mission", id: "solar-panels" },
    {
      type: "dialogue",
      lines: [
        ai(
          "The solar panels are connected. We have managed to bring the base's power system back online.",
        ),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "Now that we have some power, let's try and connect back to base and ask for help.",
        ),
        ai(
          "We cannot afford to send a high energy LASER signal, so let's use the Radio.",
        ),
        ai(
          "Radio signals work by matching the frequencies of sender and receiver.",
        ),
        ai("Let's try to connect with the base Radio."),
      ],
    },
    { type: "mission", id: "signal-match" },
    {
      type: "dialogue",
      lines: [
        ai(
          "The radio system has finished scanning. Let's see what the signal tells us.",
        ),
      ],
      outcomeLines: {
        success: [ai("Yes we managed to connect.")],
        failure: [
          ai(
            "Uh oh, that's not matching. We're wasting energy, but we did receive a response fragment.",
          ),
        ],
      },
    },
    {
      type: "dialogue",
      lines: [
        ai("Seems like they've sent us back the signal in binary."),
        ai(
          "Makes sense, binary converts words into 0s and 1s, which makes things a whole lot smaller and simpler to transmit.",
        ),
        ai("But we must decode the binary to understand it. You can do it."),
      ],
    },
    { type: "mission", id: "signal-decode" },
    {
      type: "dialogue",
      lines: [
        ai(
          "The message is decoded. Now we know they've received our call for help.",
        ),
      ],
      outcomeLines: {
        success: [
          ai(
            "Seems like they've received our call for help. But it'll take time.",
          ),
        ],
        failure: [
          ai(
            "That doesn't make sense, maybe the decode is wrong. Let's try something else. We still know the call went out, but we don't have a clear reply yet.",
          ),
        ],
      },
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "Space is big and it might take a week or even longer for help to come.",
        ),
        ai(
          "You need to survive till they come, it's on you to command and handle this base now chief.",
        ),
        ai("Chief? Should I call you chief? Maybe commander fits better."),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "Anyways, we've got a big day tomorrow, we need to prepared and healthy.",
        ),
        ai(
          "The gravity on the moon is very different from Earth. It's 6 times weaker.",
        ),
        ai(
          "So you'll have to some intense exercise to maintain your body like you did in space station, or it'll get weaker.",
        ),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai("Wow, that was a good session. Let's eat and sleep now."),
        ai("Luckily there's food in the reserve."),
        ai(
          "It has been dried completely to preserve it. Let's add water and eat it.",
        ),
        ai("Now that food's done, let's go to sleep."),
        ai(
          "The sun is still shining outside but the ECLSS will create a suitable environment to sleep.",
        ),
      ],
    },
    { type: "autonomy" },
  ],
  2: [
    {
      type: "dialogue",
      lines: [
        ai(
          "Good Morning commander, welcome to Day 2 of your survival mission.",
        ),
        ai(
          "Although we have some food in the reserve, it could run out very soon.",
        ),
        ai("So we must prepare for the future."),
        ai(
          "Veggies here are grown using different colored lights that provide the exact lights the plant need to grow.",
        ),
        ai("Select which lights we should turn on for today."),
        ai("Two lights can't be on at the same time."),
      ],
    },
    { type: "mission", id: "food-production" },
    {
      type: "dialogue",
      lines: [
        ai("Now, we need to get water. You see the big crater on the side?"),
        ai(
          "It's the Shackleton Crater, which is right at the south pole of the moon.",
        ),
        ai(
          "It's center is very deep, you could fit 15 Eiffel tower on top of each other, that's how deep it is.",
        ),
        ai(
          "But that's why the sunlight never reaches here. So it remains really cold.",
        ),
        ai("That's why it's called PSR (permanent shadow region)."),
        ai("These PSR's have ice deposits, we can collect water from there."),
        ai("Let's send a rover to go collect water."),
        ai(
          "Woah, it's quite dark, even our rover with advanced AI is struggling to find a path.",
        ),
        ai(
          "Commander, can you help it get to the water, find the path that uses the least energy.",
        ),
      ],
    },
    { type: "mission", id: "water-rover" },
    {
      type: "dialogue",
      lines: [
        ai(
          "The rover has reached the ice deposit and is returning with water.",
        ),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "Now the rover will return back with the water, let's think about our next step.",
        ),
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
    {
      type: "dialogue",
      lines: [
        ai(
          "The additional solar grid is now connected. It can supply more energy to the base.",
        ),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai("Congratulations on surviving Day 2 commander."),
        ai("Let's get some exercise, eat and sleep now."),
      ],
    },
    { type: "autonomy" },
  ],

  3: [
    {
      type: "dialogue",
      lines: [ai("You should set the lights for today.")],
    },
    { type: "mission", id: "food-production" },
    {
      type: "dialogue",
      lines: [
        ai(
          "Commander, it seems like our water rover has been damaged significantly due to the moon dust.",
        ),
        ai(
          "we need to service the rover before we could send it to fetch water again.",
        ),
        ai("Let's begin servicing the rover."),
      ],
    },
    { type: "mission", id: "rover-workshop" },
    {
      type: "dialogue",
      lines: [
        ai("Yay, the robot is fully cleaned and ready for another trip."),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai("Let's send the rover to get water again."),
        ai("Wow, that path was perfect."),
      ],
    },
    { type: "mission", id: "water-rover" },
    {
      type: "dialogue",
      lines: [ai("The rover has returned with another supply of water.")],
    },
    {
      type: "dialogue",
      lines: [
        ai("Commander, let's activate the sensors around the base."),
        ai(
          "There's a lot of threats like moon quakes, solar flares, radiation that we need to look out for.",
        ),
        ai(
          "We'll send a rover to activate the sensors. Let's try and reach all of them as quickly as we can.",
        ),
        ai("We shouldn't waste energy running around in loops."),
      ],
    },
    { type: "mission", id: "crater-sensors" },
    {
      type: "dialogue",
      lines: [
        ai(
          "All perimeter sensors are online. We will be warned if a hazard approaches the base.",
        ),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "Look at this commander, the sensors are showing a lot of charged up micro particles.",
        ),
        ai(
          "They could cause damage to the base. We need to be ready to fix the damage.",
        ),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "Let's get into the pressure rover. It's a big rover that can be used as home base while travelling around on the moon.",
        ),
        ai(
          "We'll use this to go mine some moon rocks, which we can then use to create protective shields.",
        ),
        ai(
          "It'll take time till we reach there Commander. You should do your exercise here.",
        ),
        ai("That was a good session. You should eat and sleep now."),
      ],
    },
    { type: "autonomy" },
  ],

  4: [
    {
      type: "dialogue",
      lines: [
        ai(
          "We're getting really far away from the base, it's getting really dark.",
        ),
        ai("Commander I trust you to find a path before we run out of energy."),
      ],
    },
    { type: "mission", id: "mining-navigation" },
    {
      type: "dialogue",
      lines: [
        ai(
          "The rover has completed its route. We need to keep moving while we still have enough power.",
        ),
      ],
      outcomeLines: {
        success: [
          ai(
            "Yay commander, we managed to find the path without running out of energy.",
          ),
        ],
        failure: [ai("Mission Failed")],
      },
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "We found the moon rocks we needed, but we cannot carry them all in this rover.",
        ),
        ai(
          "We must choose which ones to take, we can break the last rock to fill to the bag.",
        ),
        ai("Let's return back to the base now."),
      ],
    },
    { type: "mission", id: "sample-retrieval" },
    {
      type: "dialogue",
      lines: [
        ai(
          "We managed to set up the protective shields. They should help protect the base from the charged particles.",
        ),
      ],
    },
    {
      type: "dialogue",
      lines: [
        ai(
          "Let's get some exercise, eat and sleep. Tomorrow, you'll be in control of the base.",
        ),
      ],
    },
    { type: "autonomy" },
  ],

  5: [
    {
      type: "dialogue",
      lines: [
        ai("From Day 5 onward, you're in full control of the base, commander."),
        ai(
          "All facilities are available. Manage the base and survive until the rescue team arrives.",
        ),
      ],
    },
    { type: "sandbox" },
  ],

  6: [{ type: "sandbox" }],
  7: [{ type: "sandbox" }],
};
