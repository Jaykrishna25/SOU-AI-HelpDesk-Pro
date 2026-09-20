# Market & Technology Radar

The thirteenth agent. It answers three questions students actually ask:
what is new in the market, what should I learn to stay employable, and
which AI models have just launched.

Reachable at `/trends`, linked from every dashboard sidebar.

## The problem this design exists to solve

The obvious build is: take the question, send it to a language model, show
the answer. That produces a fluent, confident, **out-of-date** reply, because
a model's knowledge stops at its training cut-off and it has no way to tell
you where that is.

"Which AI models launched recently?" is the single worst question to put to a
model unaided. It will name the newest ones *it* knows about and present them
as current. A student then repeats that in an interview.

So the model here never supplies facts. It explains, groups and relates
entries from a curated file, and nothing else.

## How it is put together

| File | Role |
|---|---|
| `lib/trends-content.ts` | The curated briefing. Every entry dated and attributed. **This is the only source of facts.** |
| `lib/trends-core.ts` | Pure functions: freshness, search, prompt construction. No network, no DB, no clock of its own. |
| `lib/trends-api.ts` | `GET /api/trends/briefing`, `POST /api/trends/ask`. |
| `app/trends/page.tsx` | The page. |
| `tests/trends.test.ts` | Pins the rules below. |

Capability: `trends.view`, open to every signed-in role. The radar holds no
personal data and nothing confidential, and faculty advising a student need
the same briefing the student is reading.

## The rules, and why each one is there

**Stale entries are withheld, not caveated.** Each entry carries `checkedOn`.
Past `AGEING_AFTER_DAYS` (45) it is served but flagged; past
`STALE_AFTER_DAYS` (120) it is removed from the model's context entirely and
listed on the page as withheld. A caveat printed under confident prose does
not get read. Missing text does.

**A malformed or future date is stale.** `ageInDays` returns `Infinity` for an
unparseable date, and a future date is treated as stale rather than as extra
fresh. Both failure modes point the same way: toward withholding. The
opposite default would silently publish anything with a typo'd date as
current.

**No date, no entry.** A test asserts every shipped entry has a
`YYYY-MM-DD` `checkedOn`, a source name, and a body of real length.

**An empty context never reaches the model.** If nothing is current enough,
`POST /ask` returns `NO_CONTENT_MESSAGE` and the model is not called at all.
An agent handed an empty context answers from training data and sounds
exactly as confident doing it.

**Keyword search, not embeddings.** The corpus is a few dozen short entries a
person wrote. A vector index would add an API call, a failure mode and a cost
to a search a `for` loop does as well. The embedding path in `lib/ai.ts`
exists because that knowledge base is thousands of chunks of other people's
prose. This is not that.

**No-match returns everything current, not nothing.** The prompt already
forbids answering from outside the entries, so a wide context is safe — and
an empty one is the exact state in which the model would improvise.

**The existing `ai-guard` runs first.** "What will my package be", and
questions about a named person's record, go to a human from here too. The
radar knows about the market; it knows nothing about the student asking.

**Every answer ships its sources.** The chips under each reply name the
entries used and the date each was checked. A claim a student cannot trace is
a claim they should not repeat.

**Nothing is stored.** What a student asks about their own employability is
not something this portal should keep on file against their enrollment
number, and there is no analytics question worth that trade.

## Refreshing it

This is the maintenance cost the design chooses on purpose — a dated file is
a promise to maintain it.

1. Open `lib/trends-content.ts`.
2. For each entry: verify the claim against its `sourceUrl`, update `body` if
   it has changed, and set `checkedOn` to the date you actually checked.
   Delete entries that are no longer true rather than letting them age out.
3. Move `RADAR_REVIEWED_ON` only once you have been through every section.
4. Run `npm test`. The suite asserts the review date is not older than the
   newest entry, among other things.

Expect to do this monthly. The AI-model section ages fastest; one tracker
listed several hundred releases across 2026 and updates hourly.

If it is not being maintained, the page says so: the banner reports the review
age and the withheld count, and past the staleness window the assistant
declines rather than pretending. An unmaintained radar degrades into an
honest "I don't know", which is the correct floor.
