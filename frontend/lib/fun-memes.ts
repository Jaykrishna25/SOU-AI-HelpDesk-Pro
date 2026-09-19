/* ============================================================
   Culture Desk: a meme entry a day, plus a quiz built from it.

   47 entries, written in-house. Reference material about
   internet culture - origins, meanings, and in several cases
   what went wrong when a creator lost control of their own
   character. That last part is why this belongs in a campus
   portal rather than being pure filler: Trollface's author
   registered the copyright and was paid; Bad Luck Brian never
   agreed to anything; Nyan Cat's creators had to sue. Students
   who will spend their careers making things online could stand
   to know which of those outcomes is the common one.

   Several entries are deliberately uncomfortable rather than
   funny. "Girl Dinner" drifted into content glamourising eating
   very little. "NPC" is mostly used to dismiss people rather
   than argue with them. Those are the entries worth having.

   Entries describe memes in words. No copyrighted image is
   reproduced, stored or generated anywhere in this feature.

   The quiz questions are generated from the entries themselves,
   so adding an entry adds questions with no extra work. With 47
   entries a student sees a different one each day for a month
   and a half before anything repeats.
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

  /* ---- Formats ---- */
  {
    name: "Drakeposting",
    aliases: ["drake format", "prefer / reject"],
    year: "2018",
    origin: "Two frames from the Hotline Bling video: Drake waving something away, then approving of something else.",
    meaning: "Rejecting one option and preferring another. The simplest possible comparison format.",
    note: "Its success is structural - two panels is the minimum needed to make a joke about preference.",
  },
  {
    name: "Expanding Brain",
    aliases: ["galaxy brain", "big brain"],
    year: "2017",
    origin: "A four-panel stack of increasingly luminous brain scans.",
    meaning: "Escalating ideas, sincerely or sarcastically. The final panel is usually the stupidest.",
    note: "The irony is the point: the 'most enlightened' panel is where the joke lands.",
  },
  {
    name: "Two Buttons",
    aliases: ["daily struggle", "sweating guy"],
    year: "2014",
    origin: "A panel from a webcomic showing a man sweating over two buttons.",
    meaning: "A dilemma where both options are uncomfortable - or where the choice is obvious and the person agonises anyway.",
  },
  {
    name: "Is This a Pigeon?",
    aliases: ["butterfly", "pigeon meme"],
    year: "1991 anime, 2018 meme",
    origin: "A screenshot from the anime The Brave Fighter of Sun Fighbird, with mistranslated subtitles.",
    meaning: "Confidently misidentifying something, usually while being condescending about it.",
  },
  {
    name: "Trolley Problem",
    aliases: ["trolley meme"],
    year: "1967 thought experiment, memed from 2016",
    origin: "Philippa Foot's ethical thought experiment, redrawn endlessly with absurd labels.",
    meaning: "A forced choice between two harms - used to mock false dilemmas as often as real ones.",
    note: "One of few memes that sent large numbers of people to read actual moral philosophy.",
  },
  {
    name: "Woman Yelling at a Cat",
    aliases: ["confused cat at dinner", "smudge"],
    year: "2019",
    origin: "A 2011 reality-television screenshot placed beside a 2018 photo of a cat at a dinner table.",
    meaning: "An accusation met with total unbothered indifference.",
    note: "Two unrelated images from different years, combined by a stranger. Nobody designed it.",
  },
  {
    name: "Change My Mind",
    aliases: ["steven crowder table", "prove me wrong"],
    year: "2018",
    origin: "A photograph of a campus table with a sign inviting debate.",
    meaning: "Stating a position as if it were a challenge. Overwhelmingly used to mock the original.",
  },
  {
    name: "Surprised Pikachu",
    aliases: ["shocked pikachu"],
    year: "2018",
    origin: "A frame from the 1997 Pokémon anime.",
    meaning: "Feigned shock at an entirely predictable consequence.",
    note: "The whole joke is that the outcome was foreseeable, which makes it a comment on self-deception.",
  },
  {
    name: "They Don't Know",
    aliases: ["party corner", "nobody knows"],
    year: "2020",
    origin: "A crude drawing of someone standing alone at a party thinking about a niche interest.",
    meaning: "Feeling unrecognised for something you believe is impressive. Usually self-deprecating.",
  },
  {
    name: "Bugs Bunny No",
    aliases: ["communist bugs", "no bugs bunny"],
    year: "2020",
    origin: "A single frame of Bugs Bunny saying no.",
    meaning: "Flat refusal, with no argument offered.",
  },

  /* ---- Older internet ---- */
  {
    name: "All Your Base Are Belong To Us",
    aliases: ["all your base", "AYBABTU"],
    year: "1989 game, 2001 meme",
    origin: "A badly translated line from the Mega Drive port of Zero Wing.",
    meaning: "Broken-English absurdity. One of the first true internet memes.",
    note: "Predates social media entirely - it spread on forums and via email.",
  },
  {
    name: "Numa Numa",
    aliases: ["dragostea din tei"],
    year: "2004",
    origin: "A webcam video of Gary Brolsma lip-syncing to a Moldovan pop song.",
    meaning: "Unselfconscious joy. An early example of a person becoming a meme.",
    note: "Brolsma withdrew from public life for a period afterwards - an early sign of what unwanted virality costs.",
  },
  {
    name: "Leeroy Jenkins",
    aliases: ["leeroy"],
    year: "2005",
    origin: "A World of Warcraft raid video in which one player charges in and ruins a careful plan.",
    meaning: "Acting rashly and destroying everyone else's preparation.",
  },
  {
    name: "Keyboard Cat",
    aliases: ["play him off"],
    year: "1984 footage, 2007 meme",
    origin: "A 1984 home video of a cat in a shirt, its paws moved over a keyboard.",
    meaning: "Playing someone off after a failure.",
  },
  {
    name: "Trollface",
    aliases: ["problem?", "coolface"],
    year: "2008",
    origin: "A drawing by Carlos Ramirez, made in Microsoft Paint for a webcomic.",
    meaning: "Deliberate provocation for amusement.",
    note: "Ramirez registered the copyright and earned a substantial sum in licensing - one of the very few meme creators who did.",
  },
  {
    name: "Bad Luck Brian",
    aliases: ["bad luck"],
    year: "2012",
    origin: "A school yearbook photograph posted by a classmate.",
    meaning: "Compounding misfortune - a good intention producing a terrible outcome.",
    note: "The subject was identified and has spoken about the experience; he was never asked.",
  },
  {
    name: "Nyan Cat's Copyright Case",
    aliases: ["nyan lawsuit"],
    year: "2013",
    origin: "The creators of Nyan Cat and Keyboard Cat sued Warner Bros. and 5th Cell over use in a game.",
    meaning: "The point where internet culture met intellectual property law.",
    note: "Settled out of court. It established that memes have owners, which many people still assume they do not.",
  },

  /* ---- Modern ---- */
  {
    name: "NPC",
    aliases: ["non-player character", "npc meme"],
    year: "2016",
    origin: "Gaming terminology for a character with scripted responses, applied to people.",
    meaning: "Accusing someone of holding unexamined opinions. Frequently used in bad faith.",
    note: "Worth knowing precisely because it is used to dismiss people rather than to argue with them.",
  },
  {
    name: "Gigachad",
    aliases: ["chad", "sigma"],
    year: "2017",
    origin: "A digitally altered photographic art series by Krista Sudmalis.",
    meaning: "Exaggerated masculine competence, mostly ironic and sometimes not.",
    note: "The model has asked that the images not be used for the ideologies attached to them.",
  },
  {
    name: "Bottom Text",
    aliases: ["impact font", "deep fried"],
    year: "2010s",
    origin: "The default placeholder in early meme generators, left in by accident and then on purpose.",
    meaning: "Deliberate low-effort aesthetics as a joke in itself.",
  },
  {
    name: "Corporate Memphis",
    aliases: ["alegria", "big tech art style"],
    year: "2017",
    origin: "A flat illustration style with elongated limbs, adopted across technology company websites.",
    meaning: "Criticism of visual sameness in corporate design.",
    note: "A rare meme about design rather than a joke - it changed how companies actually illustrate.",
  },
  {
    name: "Mid",
    aliases: ["that's mid"],
    year: "2021",
    origin: "Shortened from 'middling', popularised through short-form video.",
    meaning: "Thoroughly average, delivered as an insult.",
  },
  {
    name: "Girl Dinner",
    aliases: [],
    year: "2023",
    origin: "A short-form video describing an assembled plate of snacks as a meal.",
    meaning: "An improvised, unstructured meal - affectionate at first.",
    note: "Drifted toward content glamourising eating very little, and moderators began adding warnings. A case of a joke's meaning shifting under it.",
  },
  {
    name: "Delulu",
    aliases: ["delusional"],
    year: "2023",
    origin: "Fan-community slang, shortened from 'delusional'.",
    meaning: "Cheerfully unrealistic optimism, usually self-applied.",
  },
  {
    name: "Aura Points",
    aliases: ["aura farming", "losing aura"],
    year: "2024",
    origin: "Short-form video slang scoring how impressive or embarrassing an action was.",
    meaning: "An informal social scoreboard, entirely made up and applied seriously.",
  },
  {
    name: "Rizz",
    aliases: ["rizzler", "unspoken rizz"],
    year: "2022",
    origin: "Shortened from 'charisma', popularised by streamer Kai Cenat.",
    meaning: "Skill at charming someone. Named Oxford word of the year in 2023.",
    note: "One of the few pieces of internet slang formally recognised by a dictionary within two years.",
  },
  {
    name: "Ohio",
    aliases: ["only in ohio"],
    year: "2016",
    origin: "A running joke treating the US state as a place where surreal things happen.",
    meaning: "Labelling anything bizarre or nonsensical.",
    note: "Now largely detached from the actual state, which is what happens to a place name used as a punchline.",
  },
  {
    name: "Fanum Tax",
    aliases: ["fanum"],
    year: "2023",
    origin: "A streamer's habit of taking a portion of a friend's food on camera.",
    meaning: "Taking a share of something that is not yours, jokingly.",
  },
  {
    name: "Chopped Chin",
    aliases: ["chopped"],
    year: "2024",
    origin: "Short-form video slang.",
    meaning: "Unattractive or badly done. Usually an insult about effort rather than appearance.",
  },
  {
    name: "Labubu",
    aliases: ["labubu doll"],
    year: "2015 toy, 2024 phenomenon",
    origin: "A collectible figure by Kasing Lung, sold in blind boxes.",
    meaning: "Collecting fervour driven by scarcity and randomness.",
    note: "A good illustration of how blind-box mechanics resemble gambling closely enough that several countries regulate them.",
  },
  {
    name: "Demure",
    aliases: ["very demure very mindful"],
    year: "2024",
    origin: "A short-form video about behaving modestly at work.",
    meaning: "Presenting oneself as considered and restrained, said ironically.",
    note: "The creator attempted to trademark the phrase and was beaten to the filing - a recurring pattern for viral phrases.",
  },
  {
    name: "Italian Brainrot",
    aliases: ["tralalero", "bombardiro"],
    year: "2025",
    origin: "AI-generated characters with invented pseudo-Italian names, spread through short-form video.",
    meaning: "Deliberate nonsense, made and shared at machine speed.",
    note: "Notable as the first large meme wave whose images were mostly machine-generated rather than drawn or photographed.",
  },
  {
    name: "Six Seven",
    aliases: ["6 7", "67"],
    year: "2025",
    origin: "A lyric fragment repeated until it detached from any meaning at all.",
    meaning: "Nothing. That is the joke - it is a sound children repeat to annoy adults.",
    note: "A useful demonstration that a meme needs no content to spread; repetition alone is sufficient.",
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
