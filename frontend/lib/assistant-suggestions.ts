/* The four questions OakMitra offers on its welcome screen.

   These live outside the page component for one reason: there is a test beside
   this file asserting that the assistant never suggests a question it will
   then refuse. That is not hypothetical - it happened. When the refusal gate
   was widened on 19 September, the first chip read "When is my semester fee
   due...", which contains "my ... fee", so the welcome screen began offering a
   question the assistant immediately declined to answer. Nothing failed, no
   error appeared; the app simply looked broken to anyone who clicked the most
   obvious button on the page.

   Pick questions the knowledge base can actually answer, phrased as policy
   rather than as a personal record. */

export interface Suggestion {
  /** Short text on the chip. */
  label: string;
  /** The question actually sent. */
  q: string;
}

export const SUGGESTIONS: Suggestion[] = [
  {
    label: "Paying fees",
    q: "How do I pay my semester fee and what should I do if the payment is not reflected?",
  },
  {
    label: "Exam rules",
    q: "What are the rules for supplementary examinations?",
  },
  {
    label: "Attendance requirement",
    q: "What is the minimum attendance requirement?",
  },
  {
    label: "Hostel and campus",
    q: "What facilities are available on campus?",
  },
];
