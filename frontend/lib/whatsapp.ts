/* ============================================================
   WhatsApp class-group parsing.

   Why the portal has this at all
   ------------------------------
   The real announcement channel at this university is not the
   portal. It is the class WhatsApp group: exam dates, submission
   deadlines, room changes and "bring your practical file
   tomorrow" arrive there and are written down nowhere else. A
   student scrolling back three weeks to find one message is doing
   retrieval by hand.

   The privacy position, which is not negotiable
   --------------------------------------------
   A WhatsApp export is not one person's data. It is every message
   every member of that group ever sent, and senders who are not
   in the uploader's contacts appear as raw phone numbers. A
   student uploading their class group hands over sixty other
   people's data, and none of those sixty were asked.

   So, in this portal:

     1. Phone numbers are removed HERE, at parse time, before the
        text reaches anything else. Senders that are numbers
        become stable pseudonyms ("Member 3"); numbers inside
        message bodies become "[number removed]".
     2. Attachments are not read. An export contains only
        "<Media omitted>" anyway, but the intent matters.
     3. NOTHING IS PERSISTED. This module has no Prisma import and
        the route that uses it writes no row. The chat lives in
        the request and in the user's own browser tab, and it is
        gone when they close it.

   Display names that are not phone numbers are kept, because
   "what did sir say about the viva" is the question people
   actually ask and stripping names makes the feature useless.
   That is a deliberate trade, stated rather than hidden.

   Pure functions only - no database, no network - so every rule
   above is unit tested.
   ============================================================ */

export interface ChatMessage {
  date: string;
  time: string;
  sender: string;
  text: string;
  /** True when the message reads like an announcement worth surfacing. */
  announcement: boolean;
}

export interface ParsedChat {
  messages: ChatMessage[];
  announcements: ChatMessage[];
  senders: string[];
  days: number;
  /** Sender names that were phone numbers and became pseudonyms. */
  numbersRedacted: number;
  /** Phone numbers removed from inside message bodies. */
  inlineRedacted: number;
  /** System lines, media placeholders and join notices skipped. */
  dropped: number;
  notes: string[];
}

/* ---------------- line format ----------------

   WhatsApp exports vary by locale. The forms seen in practice:

     12/08/2026, 09:15 - Name: message
     12/08/26, 9:15 am - Name: message
     [12/08/2026, 09:15:30] Name: message

   Both bracketed and unbracketed, 12- and 24-hour, two- and
   four-digit years. The date is kept as written rather than
   parsed into a Date: DD/MM vs MM/DD is genuinely ambiguous, and
   guessing wrong would put an exam on the wrong day. Showing the
   student the date exactly as their own export wrote it is
   correct and unambiguous.
   ------------------------------------------------ */

const LINE = new RegExp(
  "^\\[?" +
  "(\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4})" +      // date
  ",?\\s+" +
  "(\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s?[ap]\\.?m\\.?)?)" +  // time
  "\\]?\\s*[-–]?\\s*" +
  "([^:]{1,60}?)" +                              // sender
  ":\\s?" +
  "([\\s\\S]*)$",                                // message
  "i",
);

/** Lines WhatsApp writes itself, or that carry nothing retrievable. */
const SYSTEM = new RegExp(
  "(messages and calls are end-to-end encrypted" +
  "|<media omitted>|image omitted|video omitted|audio omitted|sticker omitted" +
  "|gif omitted|document omitted|contact card omitted" +
  "|this message was deleted|you deleted this message|null" +
  "|joined using this group's invite link|was added|were added|was removed" +
  "|left the group|changed the subject|changed this group's icon" +
  "|changed the group description|changed their phone number" +
  "|created group|security code changed|missed voice call|missed video call" +
  "|turned on disappearing messages|pinned a message)",
  "i",
);

const ANNOUNCEMENT = new RegExp(
  "\\b(exam|exams|examination|viva|practical|lab|submission|submit|deadline|due" +
  "|assignment|project|presentation|seminar|test|quiz|internal|syllabus" +
  "|timetable|time table|schedule|reschedul|postpon|prepon|cancel|holiday" +
  "|attendance|room|venue|hall|result|marks|fee|last date|registration" +
  "|placement|drive|interview|tomorrow|today)\\b",
  "i",
);

/* A line that opens with a date and time but has no "Sender: " is a system
   line - "X joined using this group's invite link", "Y was removed". It looks
   nothing like a message, so LINE does not match it.

   This matters more than it sounds. Without this check such a line is treated
   as a continuation and appended to the PREVIOUS message, which then matches
   the system filter and is dropped whole. A real announcement disappears and
   nothing reports that it did. Caught by the test named for it. */
const LINE_PREFIX = /^\[?\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}:\d{2}/;

/* Deliberately broad. A false positive mangles one message; a false negative
   puts somebody's phone number into the portal. */
const PHONE = /(?:\+\d{1,3}[\s\-]?)?(?:\(?\d{2,5}\)?[\s\-]?){1,3}\d{4,}/g;

/** True when a sender name is really a phone number. */
export function looksLikePhone(name: string): boolean {
  const stripped = String(name || "").replace(/[\s\-()+]/g, "");
  return /^\d+$/.test(stripped) && stripped.length >= 7;
}

/**
 * Strip phone numbers from message text.
 *
 * The nine-digit floor is the important part. "room 204", "10:00 AM",
 * "24 August" and "60 percent" all survive; a ten-digit number does not.
 * Mangling the exam time would be worse than not having this feature.
 */
export function redactInline(text: string): { text: string; count: number } {
  let count = 0;
  const out = String(text || "").replace(PHONE, match => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 9) return match;
    count++;
    return "[number removed]";
  });
  return { text: out, count };
}

/** Parse an exported chat. Never throws; an unreadable file yields no messages. */
export function parseChat(raw: string): ParsedChat {
  const lines = String(raw || "").split(/\r?\n/);

  const messages: ChatMessage[] = [];
  const pseudonyms = new Map<string, string>();
  let dropped = 0;
  let inlineRedacted = 0;

  // A message can wrap onto following lines; those continuations do not match
  // LINE and must be appended rather than counted as junk.
  let current: ChatMessage | null = null;

  const finish = () => {
    if (!current) return;
    if (current.text.trim() && !SYSTEM.test(current.text)) {
      current.announcement = ANNOUNCEMENT.test(current.text);
      messages.push(current);
    } else {
      dropped++;
    }
    current = null;
  };

  for (const line of lines) {
    const m = LINE.exec(line);
    if (!m) {
      if (!line.trim()) continue;
      if (LINE_PREFIX.test(line)) {
        // A dated line with no sender is a system notice, not a continuation
        // of the message above it. Close that message first so it survives.
        finish();
        dropped++;
      } else if (current) {
        current.text += "\n" + line.trim();
      } else {
        dropped++;
      }
      continue;
    }

    finish();

    let sender = m[3].trim();
    if (looksLikePhone(sender)) {
      if (!pseudonyms.has(sender)) {
        pseudonyms.set(sender, `Member ${pseudonyms.size + 1}`);
      }
      sender = pseudonyms.get(sender)!;
    }

    const { text, count } = redactInline(m[4].trim());
    inlineRedacted += count;

    current = { date: m[1], time: m[2], sender, text, announcement: false };
  }
  finish();

  const announcements = messages.filter(x => x.announcement);
  const senders = [...new Set(messages.map(x => x.sender))];
  const days = new Set(messages.map(x => x.date)).size;

  const notes: string[] = [];
  if (pseudonyms.size) {
    notes.push(
      `${pseudonyms.size} sender${pseudonyms.size === 1 ? "" : "s"} appeared as phone numbers `
      + `and were replaced with pseudonyms. No number was stored.`,
    );
  }
  if (inlineRedacted) {
    notes.push(`${inlineRedacted} phone number${inlineRedacted === 1 ? "" : "s"} removed from message text.`);
  }
  if (dropped) {
    notes.push(`${dropped} system line${dropped === 1 ? "" : "s"}, media placeholder and join notice skipped.`);
  }
  notes.push("Nothing from this file has been saved. It exists only in this browser tab.");

  return {
    messages, announcements, senders, days,
    numbersRedacted: pseudonyms.size,
    inlineRedacted, dropped, notes,
  };
}

/* ---------------- retrieval ----------------

   Keyword scoring rather than embeddings, deliberately. The chat
   is never stored, so it cannot be embedded in advance, and
   embedding it per question would send sixty people's messages to
   a third-party API - which is exactly what the redaction above
   exists to avoid. Local scoring keeps the data in the request.
   -------------------------------------------- */

const STOP = new Set([
  "the", "is", "at", "on", "in", "a", "an", "and", "or", "of", "to", "for",
  "what", "when", "where", "which", "who", "how", "did", "do", "does", "was",
  "were", "will", "my", "our", "i", "me", "it", "this", "that", "sir", "maam",
]);

function terms(q: string): string[] {
  return String(q || "").toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP.has(t));
}

export interface ChatHit {
  message: ChatMessage;
  score: number;
}

/**
 * Find the messages most likely to answer a question.
 *
 * Later messages win ties. That is the single most important rule here: when a
 * room or a date is announced and then corrected, the correction is the answer,
 * and a naive search returns whichever matched more words.
 */
export function searchChat(chat: ParsedChat, question: string, k = 5): ChatHit[] {
  const qt = terms(question);
  if (!qt.length) return [];

  const scored = chat.messages.map((message, index) => {
    const body = message.text.toLowerCase();
    let score = 0;
    for (const t of qt) if (body.includes(t)) score += 1;
    if (!score) return { message, score: 0 };

    // An announcement is more likely to be the answer than chatter.
    if (message.announcement) score += 0.5;
    // Recency, as a small tiebreak that cannot outweigh a real match.
    score += (index / Math.max(1, chat.messages.length)) * 0.4;
    return { message, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** The exact text the model is given. It rewords this; it never adds to it. */
export function renderHits(hits: ChatHit[], question: string): string {
  if (!hits.length) {
    return "No message in the uploaded class group matched that question. Say so "
         + "plainly and suggest asking the class representative. Do not guess a "
         + "date, a room or a deadline.";
  }
  const lines = [
    "MESSAGES FROM THE STUDENT'S CLASS GROUP, most relevant first.",
    `Question: ${question}`,
    "",
  ];
  for (const h of hits) {
    lines.push(`[${h.message.date} ${h.message.time}] ${h.message.sender}: ${h.message.text}`);
  }
  lines.push("");
  lines.push(
    "If two messages conflict, the LATER one wins - a message correcting a room "
    + "or a date is the answer, and you should say it was changed. Phone numbers "
    + "have been removed from this data. If none of these states the answer, say "
    + "it was not found rather than inventing one.",
  );
  return lines.join("\n");
}
