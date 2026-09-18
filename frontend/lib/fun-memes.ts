/* ============================================================
   Culture Desk: a meme entry a day, plus a quiz built from it.

   The corpus is deliberately small and written in-house. It is
   reference material about internet culture - origins, meanings,
   and in several cases what went wrong when a creator lost
   control of their own character. That last part is why this
   belongs in a campus portal rather than being pure filler.

   The quiz questions are generated from the entries themselves,
   so adding an entry adds questions with no extra work.
   ============================================================ */

export interface MemeEntry {
  name: string;
  aliases: string[];
  year: string;
  origin: string;
  meaning: string;
  note?: string;
}

export const MEMES: MemeEntry[] = [
  {
    name: "Distracted Boyfriend",
    aliases: ["the guy looking back", "wandering eye"],
    year: "2015 photo, 2017 meme",
    origin: "A stock photograph by Spanish photographer Antonio Guillem, shot around the theme of infidelity.",
    meaning: "Choosing a tempting new option over a loyal existing one. The three figures get labelled, which is what makes it endlessly reusable.",
    note: "One of very few formats that encodes a three-part relationship in a single image.",
  },
  {
    name: "Rickrolling",
    aliases: ["rickroll", "never gonna give you up"],
    year: "2007",
    origin: "Rick Astley's 1987 single, repurposed as a bait-and-switch link on imageboards.",
    meaning: "Tricking someone into clicking through to the video.",
    note: "It survives everybody knowing about it, which almost no other joke format manages.",
  },
  {
    name: "This Is Fine",
    aliases: ["the dog in the burning room"],
    year: "2013",
    origin: "A webcomic strip called 'On Fire' by KC Green.",
    meaning: "Denial in the face of obvious disaster.",
    note: "Green has commented on the meme being used to defend the very complacency the strip mocked.",
  },
  {
    name: "Doge",
    aliases: ["shiba meme", "such wow"],
    year: "2010 photo, 2013 meme",
    origin: "A photograph of Kabosu, a Japanese Shiba Inu, captioned with broken inner-monologue phrases.",
    meaning: "Naive enthusiasm, expressed as 'much wow', 'so scare'.",
    note: "Produced Dogecoin, which started as a joke about the meme and became a real traded asset.",
  },
  {
    name: "Pepe the Frog",
    aliases: ["sad frog", "feels good man"],
    year: "2005",
    origin: "A character from Matt Furie's comic 'Boy's Club'.",
    meaning: "Originally laid-back contentment.",
    note: "Later adopted by extremist groups online; Furie fought the appropriation publicly and legally. The clearest case of a creator losing control of a character.",
  },
  {
    name: "Loss",
    aliases: ["loss.jpg", "the four panel thing"],
    year: "2008",
    origin: "A strip from the webcomic Ctrl+Alt+Del, widely mocked for its tonal whiplash.",
    meaning: "Nothing in itself. The joke is recognising the four-panel layout in abstract forms.",
    note: "The purest example of a meme that is a shape rather than a message.",
  },
  {
    name: "Skibidi Toilet",
    aliases: ["that skibidi thing", "toilet head video"],
    year: "2023",
    origin: "A YouTube Shorts series by Alexey Gerasimov made in Source Filmmaker.",
    meaning: "Originally nothing - an absurdist serial. 'Skibidi' became shorthand for chaotic nonsense.",
    note: "Mostly a generational marker: it signals which side of an age line you are on.",
  },
  {
    name: "Among Us",
    aliases: ["sus", "amogus"],
    year: "2018 game, 2020 meme",
    origin: "A social deduction game that became enormous during lockdowns.",
    meaning: "'Sus' entered general slang for suspicious. The crewmate silhouette is now spotted in unrelated shapes.",
  },
  {
    name: "Nyan Cat",
    aliases: ["pop tart cat"],
    year: "2011",
    origin: "An animation pairing a pop-tart cat with a Japanese vocal track.",
    meaning: "Early internet absurdism and endless looping.",
    note: "Sold as an NFT in 2021, making it a reference point in arguments about whether a meme can be owned.",
  },
  {
    name: "Ice Bucket Challenge",
    aliases: ["als challenge"],
    year: "2014",
    origin: "A fundraising campaign for ALS research spread by nomination.",
    meaning: "Participation through being named by someone else.",
    note: "One of the few memes with a measurable charitable outcome, and the template for later nomination challenges.",
  },
  {
    name: "Wojak",
    aliases: ["feels guy"],
    year: "2010",
    origin: "A simple MS Paint face from Polish imageboards.",
    meaning: "Originally melancholy and empathy - 'I know that feel'.",
    note: "Spawned a large family of stereotype variants, which is why the format is repeatedly used for political content.",
  },
  {
    name: "Barbenheimer",
    aliases: [],
    year: "2023",
    origin: "The same-day cinema release of Barbie and Oppenheimer.",
    meaning: "Enthusiasm for the absurd contrast of watching both as a double feature.",
    note: "An audience-generated marketing event that no studio planned or could have bought.",
  },
  {
    name: "Brain Rot",
    aliases: ["brainrot"],
    year: "2024",
    origin: "Slang that surged for content that is compulsively watchable and worthless.",
    meaning: "Both a complaint and a badge of honour, depending on who says it.",
    note: "Named Oxford word of the year in 2024.",
  },
  {
    name: "Moo Deng",
    aliases: [],
    year: "2024",
    origin: "A pygmy hippopotamus born in Thailand who became a global internet subject.",
    meaning: "Uncomplicated collective affection for an animal.",
    note: "Part of a long line - Grumpy Cat, Doge, Noodle - showing animal memes are the most durable category.",
  },
];

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same entry for everyone on a given day. */
export function memeOfTheDay(date: string): MemeEntry {
  return MEMES[seedFrom("meme:" + date) % MEMES.length];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
}

/**
 * Three questions built from the corpus itself, so adding an entry adds
 * questions. Distractors are other real entries, never invented ones.
 */
export function quizFor(date: string): QuizQuestion[] {
  const seed = seedFrom("quiz:" + date);
  let n = seed;
  const rnd = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };

  const pool = [...MEMES].sort(() => rnd() - 0.5);
  const picks = pool.slice(0, 3);

  return picks.map(entry => {
    const wrong = MEMES.filter(m => m.name !== entry.name).sort(() => rnd() - 0.5).slice(0, 3);
    const options = [...wrong.map(w => w.name), entry.name].sort(() => rnd() - 0.5);
    return {
      question: `Which of these is described as: "${entry.meaning}"`,
      options,
      answerIndex: options.indexOf(entry.name),
    };
  });
}

export function quizScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 600) + (correct === total ? 200 : 0);
}
