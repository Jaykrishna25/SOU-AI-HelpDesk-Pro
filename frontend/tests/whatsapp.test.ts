import { describe, it, expect } from "vitest";
import {
  parseChat, searchChat, renderHits, looksLikePhone, redactInline,
} from "@/lib/whatsapp";

/* The privacy claims this feature makes are the ones worth testing. If a later
   change lets a phone number through, or mangles a room number, the suite
   fails rather than a student getting it wrong. */

const SAMPLE = `12/08/2026, 09:14 - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
12/08/2026, 09:15 - Prof Mehta: Good morning. Semester 5 timetable is on the notice board.
12/08/2026, 10:02 - +91 98765 43210 joined using this group's invite link
12/08/2026, 10:41 - +91 98765 43210: anyone has last year DBMS question paper
13/08/2026, 11:05 - Prof Mehta: DBMS internal test is on Monday 24 August, 10:00 AM, room 204. Units 1 to 3 only.
14/08/2026, 08:50 - Prof Iyer: OS practical file must be submitted before Friday 21 August.
14/08/2026, 19:12 - Riya CR: <Media omitted>
17/08/2026, 09:30 - Riya CR: Call me on 9876543210 if you need the notes.
18/08/2026, 14:20 - Prof Mehta: The DBMS internal has moved from room 204 to room 108. Same date and time.
28/08/2026, 09:15 - Prof Iyer: Monday 31 August is a holiday. No lectures.`;

describe("phone numbers never survive parsing", () => {
  const chat = parseChat(SAMPLE);

  it("turns a phone-number sender into a pseudonym", () => {
    expect(chat.numbersRedacted).toBe(1);
    expect(chat.senders).toContain("Member 1");
    expect(chat.senders.join(" ")).not.toMatch(/98765/);
  });

  it("removes phone numbers from inside message text", () => {
    const all = chat.messages.map(m => m.text).join(" ");
    expect(all).not.toMatch(/9876543210/);
    expect(all).toContain("[number removed]");
    expect(chat.inlineRedacted).toBeGreaterThan(0);
  });

  it("leaves no digits resembling a phone number anywhere", () => {
    const everything = JSON.stringify(chat);
    expect(everything).not.toMatch(/\d{10}/);
  });

  it("identifies phone-number senders but not real names", () => {
    expect(looksLikePhone("+91 98765 43210")).toBe(true);
    expect(looksLikePhone("919876543210")).toBe(true);
    expect(looksLikePhone("Prof Mehta")).toBe(false);
    expect(looksLikePhone("Riya CR")).toBe(false);
  });
});

describe("redaction does not damage the information students need", () => {
  /* This is the whole reason for the nine-digit floor. Mangling an exam time
     would be worse than not having the feature at all. */
  const keep = [
    "DBMS internal test is on Monday 24 August, 10:00 AM, room 204.",
    "moved from room 204 to room 108",
    "Minimum 60 percent aggregate required.",
    "Monday 31 August is a holiday.",
    "Submit by 21/08/2026",
    "Groups of three, ten minutes each.",
  ];
  for (const text of keep) {
    it(`keeps: ${text.slice(0, 40)}`, () => {
      expect(redactInline(text).count).toBe(0);
      expect(redactInline(text).text).toBe(text);
    });
  }

  const strip = ["call me on +91 98765 43210", "my number is 9876543210"];
  for (const text of strip) {
    it(`strips: ${text}`, () => {
      expect(redactInline(text).count).toBe(1);
      expect(redactInline(text).text).toContain("[number removed]");
    });
  }
});

describe("system lines are dropped, real messages are not", () => {
  const chat = parseChat(SAMPLE);

  it("drops the encryption notice, the join notice and the media placeholder", () => {
    const all = chat.messages.map(m => m.text).join(" ").toLowerCase();
    expect(all).not.toContain("end-to-end encrypted");
    expect(all).not.toContain("invite link");
    expect(all).not.toContain("media omitted");
    expect(chat.dropped).toBeGreaterThanOrEqual(3);
  });

  it("keeps the messages that carry information", () => {
    expect(chat.messages.length).toBe(7);
    expect(chat.days).toBe(6);
  });

  it("does not let a dated system line swallow the message above it", () => {
    /* This was a real bug, found before this feature ever shipped.
       "+91 ... joined using this group's invite link" has no "Sender:" part,
       so it does not match the message pattern. It was therefore treated as a
       continuation and appended to the PREVIOUS message - which then matched
       the system filter and was dropped whole. Prof Mehta's timetable
       announcement vanished, and nothing reported that it had.

       A dated line with no sender is now closed off as a system notice. */
    expect(chat.messages.some(m => m.text.includes("Good morning"))).toBe(true);
    expect(chat.messages.some(m => m.text.includes("timetable"))).toBe(true);
  });

  it("flags announcements", () => {
    const texts = chat.announcements.map(m => m.text).join(" ");
    expect(texts).toContain("room 108");
    expect(texts).toContain("practical file");
  });
});

describe("the later correction wins", () => {
  /* The case the whole feature stands or falls on. Two messages mention this
     test; one says room 204, a later one moves it to 108. A student told 204
     walks into the wrong room. */
  const chat = parseChat(SAMPLE);

  it("ranks the correction above the original announcement", () => {
    const hits = searchChat(chat, "when is the DBMS internal and which room?", 5);
    expect(hits.length).toBeGreaterThan(0);
    const top = hits[0].message.text;
    expect(top).toContain("108");
  });

  it("still returns the original, so the change is visible", () => {
    const hits = searchChat(chat, "DBMS internal room", 5);
    const all = hits.map(h => h.message.text).join(" ");
    expect(all).toContain("204");
    expect(all).toContain("108");
  });

  it("tells the model that the later message wins", () => {
    const out = renderHits(searchChat(chat, "DBMS internal room", 3), "DBMS internal room");
    expect(out).toMatch(/later one wins/i);
    expect(out).toMatch(/was changed/i);
  });
});

describe("search behaviour", () => {
  const chat = parseChat(SAMPLE);

  it("finds a message by who sent it and what it was about", () => {
    const hits = searchChat(chat, "practical file submission", 3);
    expect(hits[0].message.sender).toBe("Prof Iyer");
  });

  it("returns nothing for a question the group never discussed", () => {
    expect(searchChat(chat, "canteen menu prices", 5)).toEqual([]);
  });

  it("refuses rather than guesses when nothing matched", () => {
    const out = renderHits([], "when is the canteen open?");
    expect(out).toMatch(/not found|no message/i);
    expect(out).toMatch(/do not guess/i);
  });

  it("handles an empty or junk question without throwing", () => {
    expect(searchChat(chat, "")).toEqual([]);
    expect(searchChat(chat, "the is at on")).toEqual([]);
  });
});

describe("robustness", () => {
  it("parses an empty file without throwing", () => {
    const chat = parseChat("");
    expect(chat.messages).toEqual([]);
    expect(chat.days).toBe(0);
  });

  it("parses a file that is not a WhatsApp export without throwing", () => {
    const chat = parseChat("this is just some text\nwith no structure at all");
    expect(chat.messages).toEqual([]);
  });

  it("handles the bracketed export format", () => {
    const chat = parseChat("[12/08/2026, 09:15:30] Prof Mehta: Timetable is up.");
    expect(chat.messages.length).toBe(1);
    expect(chat.messages[0].sender).toBe("Prof Mehta");
  });

  it("handles 12-hour times and two-digit years", () => {
    const chat = parseChat("12/08/26, 9:15 am - Riya CR: Notes uploaded.");
    expect(chat.messages.length).toBe(1);
  });

  it("joins a message that wraps onto the next line", () => {
    const chat = parseChat(
      "12/08/2026, 09:15 - Prof Mehta: First line\nsecond line of the same message",
    );
    expect(chat.messages.length).toBe(1);
    expect(chat.messages[0].text).toContain("second line");
  });

  it("always states that nothing was saved", () => {
    expect(parseChat(SAMPLE).notes.join(" ")).toMatch(/nothing.*has been saved/i);
  });
});
