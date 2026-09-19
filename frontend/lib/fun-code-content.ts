/* ============================================================
   Content for the six code games.

   All written in-house. Nothing here is copied from CheckiO,
   CodeCombat, Semantris or any other product - those are other
   people's work. What is borrowed is the *mechanic*: predicting
   output, sequencing commands, semantic association. A mechanic
   is an idea; a puzzle set is a work.

   Everything is small on purpose. A Fun Zone puzzle has to be
   finishable in a lunch break, and a thirty-line function on a
   phone screen is not a game.
   ============================================================ */

/* ---------------- typing sprint ---------------- */

/** Code rather than prose. Brackets and underscores are the hard part. */
export const TYPING_SNIPPETS: { lang: string; text: string }[] = [
  { lang: "python", text: "def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1" },
  { lang: "python", text: "result = [x * 2 for x in numbers if x % 2 == 0]" },
  { lang: "sql", text: "SELECT name, COUNT(*) FROM students GROUP BY name HAVING COUNT(*) > 1;" },
  { lang: "javascript", text: "const total = items.reduce((sum, i) => sum + i.price, 0);" },
  { lang: "java", text: "public static void main(String[] args) { System.out.println(\"ok\"); }" },
  { lang: "c", text: "for (int i = 0; i < n; i++) { sum += arr[i]; }" },
  { lang: "python", text: "with open(path, encoding='utf-8') as f:\n    data = json.load(f)" },
  { lang: "sql", text: "UPDATE fees SET paid = paid + 5000 WHERE student_id = 42;" },
  { lang: "javascript", text: "const [state, setState] = useState({ loading: false });" },
  { lang: "python", text: "class Node:\n    def __init__(self, value, next=None):" },
  { lang: "c", text: "struct Node { int data; struct Node *next; };" },
  { lang: "javascript", text: "await fetch(url).then(r => r.json()).catch(() => null);" },
];

/* ---------------- jumble programming ----------------

   Reorder shuffled lines into a working function. Indentation is
   given, so the puzzle is about logical order rather than about
   remembering how many spaces Python wants.
   ------------------------------------------------------ */

export interface JumblePuzzle {
  title: string;
  lang: string;
  /** In the correct order. */
  lines: string[];
  hint: string;
}

export const JUMBLES: JumblePuzzle[] = [
  {
    title: "Reverse a linked list",
    lang: "python",
    lines: [
      "def reverse(head):",
      "    prev = None",
      "    while head:",
      "        nxt = head.next",
      "        head.next = prev",
      "        prev = head",
      "        head = nxt",
      "    return prev",
    ],
    hint: "Save the next node before you overwrite the pointer.",
  },
  {
    title: "Binary search",
    lang: "python",
    lines: [
      "def search(arr, target):",
      "    lo, hi = 0, len(arr) - 1",
      "    while lo <= hi:",
      "        mid = (lo + hi) // 2",
      "        if arr[mid] == target:",
      "            return mid",
      "        elif arr[mid] < target:",
      "            lo = mid + 1",
      "        else:",
      "            hi = mid - 1",
      "    return -1",
    ],
    hint: "Narrow the window before you check again.",
  },
  {
    title: "Factorial, iteratively",
    lang: "python",
    lines: [
      "def factorial(n):",
      "    result = 1",
      "    for i in range(2, n + 1):",
      "        result *= i",
      "    return result",
    ],
    hint: "Start from a value that does not change the product.",
  },
  {
    title: "Check for a balanced bracket string",
    lang: "python",
    lines: [
      "def balanced(s):",
      "    stack = []",
      "    for ch in s:",
      "        if ch == '(':",
      "            stack.append(ch)",
      "        elif ch == ')':",
      "            if not stack:",
      "                return False",
      "            stack.pop()",
      "    return len(stack) == 0",
    ],
    hint: "An empty stack on a closing bracket means it never opened.",
  },
  {
    title: "Insert into a sorted list",
    lang: "python",
    lines: [
      "def insert_sorted(arr, value):",
      "    i = 0",
      "    while i < len(arr) and arr[i] < value:",
      "        i += 1",
      "    arr.insert(i, value)",
      "    return arr",
    ],
    hint: "Walk forward until the next element is not smaller.",
  },
  {
    title: "Count word frequency",
    lang: "python",
    lines: [
      "def counts(words):",
      "    freq = {}",
      "    for w in words:",
      "        freq[w] = freq.get(w, 0) + 1",
      "    return freq",
    ],
    hint: "A word seen for the first time starts at zero.",
  },
];

/* ---------------- debug it ----------------

   One block, one bug. The bug is always a real one a student
   would actually write - an off-by-one, a wrong operator, a
   missing return - never a typo that a compiler would catch.
   Finding a missing semicolon teaches nothing.
   -------------------------------------------- */

export interface DebugPuzzle {
  title: string;
  lang: string;
  lines: string[];
  /** Zero-based index of the line containing the bug. */
  buggyLine: number;
  explanation: string;
  fixed: string;
}

export const DEBUGS: DebugPuzzle[] = [
  {
    title: "Sum an array",
    lang: "c",
    lines: [
      "int sum(int arr[], int n) {",
      "    int total = 0;",
      "    for (int i = 0; i <= n; i++) {",
      "        total += arr[i];",
      "    }",
      "    return total;",
      "}",
    ],
    buggyLine: 2,
    explanation:
      "`i <= n` reads one element past the end of the array. Valid indices stop at n-1.",
    fixed: "    for (int i = 0; i < n; i++) {",
  },
  {
    title: "Find the maximum",
    lang: "python",
    lines: [
      "def largest(numbers):",
      "    biggest = 0",
      "    for n in numbers:",
      "        if n > biggest:",
      "            biggest = n",
      "    return biggest",
    ],
    buggyLine: 1,
    explanation:
      "Starting at 0 returns 0 for a list of all-negative numbers. Start from the first element instead.",
    fixed: "    biggest = numbers[0]",
  },
  {
    title: "Swap two variables",
    lang: "python",
    lines: [
      "def swap(a, b):",
      "    a = b",
      "    b = a",
      "    return a, b",
    ],
    buggyLine: 1,
    explanation:
      "The first assignment destroys `a` before it is copied, so both end up holding b's value.",
    fixed: "    a, b = b, a   # and delete the next line",
  },
  {
    title: "Average of a list",
    lang: "python",
    lines: [
      "def average(scores):",
      "    total = 0",
      "    for s in scores:",
      "        total += s",
      "        return total / len(scores)",
    ],
    buggyLine: 4,
    explanation:
      "The return is inside the loop, so it exits after the first element. It belongs one level out.",
    fixed: "    return total / len(scores)   # dedented, outside the loop",
  },
  {
    title: "Check if a string is a palindrome",
    lang: "python",
    lines: [
      "def is_palindrome(s):",
      "    for i in range(len(s)):",
      "        if s[i] != s[len(s) - i]:",
      "            return False",
      "    return True",
    ],
    buggyLine: 2,
    explanation:
      "`len(s) - i` is off by one and reads past the end on the first iteration. It should be `len(s) - 1 - i`.",
    fixed: "        if s[i] != s[len(s) - 1 - i]:",
  },
  {
    title: "Count even numbers",
    lang: "javascript",
    lines: [
      "function countEven(nums) {",
      "  let count = 0;",
      "  for (const n of nums) {",
      "    if (n % 2 = 0) count++;",
      "  }",
      "  return count;",
      "}",
    ],
    buggyLine: 3,
    explanation:
      "`=` assigns; `===` compares. This is the one syntax bug in the set because it is the single most common mistake a first-year makes.",
    fixed: "    if (n % 2 === 0) count++;",
  },
  {
    title: "Delete from a dictionary while iterating",
    lang: "python",
    lines: [
      "def drop_zeros(d):",
      "    for k in d:",
      "        if d[k] == 0:",
      "            del d[k]",
      "    return d",
    ],
    buggyLine: 1,
    explanation:
      "Mutating a dict while iterating it raises RuntimeError. Iterate over `list(d)` instead.",
    fixed: "    for k in list(d):",
  },
];

/* ---------------- predict the output ----------------

   The CheckiO mechanic - read code, say what it does - built
   from scratch. Multiple choice rather than free text, because
   marking free-text output means running the code, and running a
   student's code on a server is a security problem nobody should
   take on for a lunch-break game.
   ------------------------------------------------------ */

export interface OutputPuzzle {
  lang: string;
  code: string;
  options: string[];
  /** Index into options. */
  answer: number;
  explanation: string;
}

export const OUTPUTS: OutputPuzzle[] = [
  {
    lang: "python",
    code: "a = [1, 2, 3]\nb = a\nb.append(4)\nprint(len(a))",
    options: ["3", "4", "1", "Error"],
    answer: 1,
    explanation: "`b = a` binds the same list. There is one list here, not two.",
  },
  {
    lang: "python",
    code: "print(3 // 2, 3 / 2)",
    options: ["1 1.5", "1.5 1.5", "1 1", "1.5 1"],
    answer: 0,
    explanation: "`//` is floor division and returns an int; `/` always returns a float.",
  },
  {
    lang: "javascript",
    code: "console.log([1, 2, 3] + [4]);",
    options: ["[1,2,3,4]", "1,2,34", "10", "Error"],
    answer: 1,
    explanation:
      "`+` stringifies both arrays and concatenates: \"1,2,3\" + \"4\". Array addition is not a thing.",
  },
  {
    lang: "python",
    code: "x = 'abc'\nprint(x[::-1])",
    options: ["abc", "cba", "a", "Error"],
    answer: 1,
    explanation: "A step of -1 walks the string backwards.",
  },
  {
    lang: "javascript",
    code: "console.log(typeof null);",
    options: ["\"null\"", "\"object\"", "\"undefined\"", "Error"],
    answer: 1,
    explanation:
      "A bug from 1995 that can never be fixed without breaking the web. Worth knowing precisely because it is wrong.",
  },
  {
    lang: "python",
    code: "print(bool('False'))",
    options: ["False", "True", "Error", "None"],
    answer: 1,
    explanation: "Any non-empty string is truthy. The contents are never inspected.",
  },
  {
    lang: "sql",
    code: "SELECT COUNT(*) FROM marks WHERE score > NULL;",
    options: ["all rows", "0", "NULL", "Error"],
    answer: 1,
    explanation:
      "Any comparison with NULL is unknown, never true, so no row qualifies. Use IS NOT NULL.",
  },
  {
    lang: "javascript",
    code: "console.log(0.1 + 0.2 === 0.3);",
    options: ["true", "false", "Error", "undefined"],
    answer: 1,
    explanation:
      "Binary floating point cannot represent 0.1 exactly. The sum is 0.30000000000000004.",
  },
  {
    lang: "python",
    code: "def f(items=[]):\n    items.append(1)\n    return len(items)\nprint(f(), f())",
    options: ["1 1", "1 2", "2 2", "Error"],
    answer: 1,
    explanation:
      "The default list is created once, at definition, and reused on every call. The classic Python trap.",
  },
  {
    lang: "c",
    code: "int a = 5;\nprintf(\"%d\", a++ + ++a);",
    options: ["10", "12", "11", "undefined behaviour"],
    answer: 3,
    explanation:
      "Modifying `a` twice between sequence points is undefined. Any answer a compiler gives is equally 'correct'.",
  },
];

/* ---------------- robot path ----------------

   The CodeCombat mechanic - write a sequence of commands to move
   a character - reduced to its core and built from scratch. A
   fixed grid, four commands, and a target. No code execution, no
   sandbox, no dependency.
   ---------------------------------------------- */

export interface RobotLevel {
  /** Rows of the grid: "." empty, "#" wall, "S" start, "G" goal, "*" coin. */
  grid: string[];
  /**
   * The true shortest path from S to G, ignoring coins.
   *
   * These are computed with a breadth-first search, not estimated. The first
   * draft of this file guessed them, and the guesses were wrong by three to
   * four moves in every level — one of which was not solvable at all by the
   * route the hint described. A "par" that nobody can reach is worse than no
   * par, because a student assumes they are the problem.
   */
  par: number;
  hint: string;
}

export const ROBOT_LEVELS: RobotLevel[] = [
  {
    grid: [
      "S..#.",
      ".#...",
      ".#.#.",
      "...#G",
    ],
    par: 7,
    hint: "The bottom row is blocked. Go across the top first.",
  },
  {
    grid: [
      "S.*..",
      "###.#",
      "..*..",
      ".###.",
      "....G",
    ],
    par: 8,
    hint: "The coins are optional. Points, not obligations.",
  },
  {
    grid: [
      "S....",
      ".###.",
      ".#*#.",
      ".#.#.",
      "...#G",
    ],
    par: 8,
    hint: "The centre is a dead end with a coin in it. Decide if it is worth the steps.",
  },
  {
    grid: [
      "S.#..",
      "..#.*",
      "#....",
      "..##.",
      "*...G",
    ],
    par: 8,
    hint: "Two routes work. One is shorter, one collects more.",
  },
];

/* ---------------- semantic match ----------------

   The Semantris mechanic - clear a stack by typing a word that
   relates to one of them - built over this syllabus rather than
   over a general language model. The associations below are
   written, not computed, so the game is about subject knowledge
   rather than about guessing what an embedding thinks.
   -------------------------------------------------- */

export interface SemanticTerm {
  term: string;
  /** Words that should clear this term. Checked case-insensitively. */
  accepts: string[];
  subject: string;
}

export const SEMANTIC_TERMS: SemanticTerm[] = [
  { term: "Deadlock", subject: "OS", accepts: ["circular", "wait", "mutex", "lock", "resource", "starvation", "banker", "hold"] },
  { term: "Normalisation", subject: "DBMS", accepts: ["redundancy", "3nf", "bcnf", "dependency", "decompose", "anomaly", "duplicate", "table"] },
  { term: "Index", subject: "DBMS", accepts: ["btree", "b-tree", "lookup", "speed", "search", "hash", "query", "faster"] },
  { term: "Recursion", subject: "DSA", accepts: ["base", "case", "stack", "factorial", "call", "itself", "fibonacci", "depth"] },
  { term: "Hash table", subject: "DSA", accepts: ["collision", "bucket", "key", "o1", "constant", "chaining", "map", "dictionary"] },
  { term: "TCP", subject: "Networks", accepts: ["handshake", "reliable", "ack", "connection", "syn", "ordered", "retransmit", "stream"] },
  { term: "Firewall", subject: "Security", accepts: ["block", "filter", "port", "rule", "packet", "network", "allow", "traffic"] },
  { term: "Encryption", subject: "Security", accepts: ["key", "cipher", "aes", "rsa", "decrypt", "secret", "plaintext", "symmetric"] },
  { term: "Cache", subject: "OS", accepts: ["fast", "memory", "hit", "miss", "locality", "lru", "temporary", "store"] },
  { term: "Compiler", subject: "SE", accepts: ["parse", "lexer", "token", "translate", "machine", "syntax", "optimise", "code"] },
  { term: "Big-O", subject: "DSA", accepts: ["complexity", "growth", "worst", "time", "asymptotic", "logn", "quadratic", "upper"] },
  { term: "Semaphore", subject: "OS", accepts: ["signal", "wait", "counter", "sync", "mutex", "critical", "section", "block"] },
  { term: "Foreign key", subject: "DBMS", accepts: ["reference", "parent", "integrity", "constraint", "join", "link", "primary", "relation"] },
  { term: "DNS", subject: "Networks", accepts: ["domain", "name", "resolve", "ip", "lookup", "server", "address", "hostname"] },
  { term: "Garbage collection", subject: "OS", accepts: ["memory", "free", "unreachable", "heap", "automatic", "reference", "leak", "reclaim"] },
  { term: "Race condition", subject: "OS", accepts: ["timing", "concurrent", "shared", "thread", "order", "unpredictable", "lock", "critical"] },
];
