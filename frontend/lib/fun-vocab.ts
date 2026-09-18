/* ============================================================
   Subject vocabulary for Concept Ladder.

   Every term carries a short definition, and closeness between
   two terms is computed from how much their definitions overlap
   (see fun-ladder.ts). That is why the definitions are written
   the way they are: each one names the concepts it relates to,
   so "index" and "b-tree" land near each other because they
   genuinely share subject matter, not because someone hand-wired
   a link.

   This doubles as the revision payload. When a student guesses a
   term the game shows its definition, so a wrong guess still
   teaches something.
   ============================================================ */

export interface Term {
  word: string;
  subject: string;
  definition: string;
}

export const VOCAB: Term[] = [
  // ---- data structures and algorithms ----
  { word: "array", subject: "DSA", definition: "contiguous memory storing elements of one type with constant time index access" },
  { word: "linked list", subject: "DSA", definition: "nodes each holding data and a pointer to the next node, allowing insertion without shifting memory" },
  { word: "stack", subject: "DSA", definition: "last in first out structure supporting push and pop, used for function calls and recursion" },
  { word: "queue", subject: "DSA", definition: "first in first out structure supporting enqueue and dequeue, used for scheduling and buffering" },
  { word: "binary tree", subject: "DSA", definition: "tree structure where each node has at most two children, used for hierarchical data and searching" },
  { word: "binary search", subject: "DSA", definition: "algorithm halving a sorted array each step to find a value in logarithmic time" },
  { word: "hash table", subject: "DSA", definition: "structure mapping keys to values through a hash function giving average constant time lookup" },
  { word: "graph", subject: "DSA", definition: "set of vertices connected by edges, used to model networks and relationships" },
  { word: "recursion", subject: "DSA", definition: "function calling itself on a smaller input until a base case, using the call stack" },
  { word: "heap", subject: "DSA", definition: "tree structure keeping the largest or smallest element at the root, used for priority queues" },
  { word: "sorting", subject: "DSA", definition: "arranging elements in order, with algorithms compared by time complexity and stability" },
  { word: "complexity", subject: "DSA", definition: "measure of how an algorithm's time or memory grows with input size, written in big O notation" },
  { word: "dynamic programming", subject: "DSA", definition: "solving a problem by storing results of overlapping subproblems to avoid recomputation" },
  { word: "greedy", subject: "DSA", definition: "algorithm making the locally best choice at each step hoping for a global optimum" },
  { word: "traversal", subject: "DSA", definition: "visiting every node of a tree or graph in a defined order such as depth first or breadth first" },
  { word: "pointer", subject: "DSA", definition: "variable holding a memory address, used for dynamic allocation and linked structures" },

  // ---- databases ----
  { word: "database", subject: "DBMS", definition: "organised collection of persistent data managed by a system supporting queries and transactions" },
  { word: "sql", subject: "DBMS", definition: "declarative language for querying and modifying relational database tables" },
  { word: "table", subject: "DBMS", definition: "relation of rows and columns storing records in a relational database" },
  { word: "primary key", subject: "DBMS", definition: "column uniquely identifying each row of a table, enforcing entity integrity" },
  { word: "foreign key", subject: "DBMS", definition: "column referencing a primary key in another table, enforcing referential integrity between relations" },
  { word: "index", subject: "DBMS", definition: "auxiliary structure often a b-tree that speeds up lookup on a column at the cost of write time" },
  { word: "b-tree", subject: "DBMS", definition: "balanced tree structure used for database indexes giving logarithmic lookup on disk" },
  { word: "normalisation", subject: "DBMS", definition: "organising tables to remove redundancy and update anomalies through normal forms" },
  { word: "transaction", subject: "DBMS", definition: "sequence of database operations treated as one atomic unit that either commits or rolls back" },
  { word: "acid", subject: "DBMS", definition: "atomicity consistency isolation durability, the guarantees a transaction system provides" },
  { word: "join", subject: "DBMS", definition: "operation combining rows from two tables based on a related column such as a foreign key" },
  { word: "deadlock", subject: "DBMS", definition: "two transactions each waiting for a lock the other holds, so neither can proceed" },
  { word: "schema", subject: "DBMS", definition: "definition of tables columns and constraints describing the structure of a database" },

  // ---- operating systems ----
  { word: "process", subject: "OS", definition: "program in execution with its own memory space, scheduled by the operating system" },
  { word: "thread", subject: "OS", definition: "lightweight unit of execution sharing memory with other threads in the same process" },
  { word: "scheduling", subject: "OS", definition: "deciding which process or thread runs next on the processor, using policies like round robin" },
  { word: "kernel", subject: "OS", definition: "core of the operating system managing memory processes and hardware access" },
  { word: "virtual memory", subject: "OS", definition: "abstraction giving each process its own address space, backed by paging to disk" },
  { word: "paging", subject: "OS", definition: "dividing memory into fixed size pages so processes can use non contiguous physical memory" },
  { word: "semaphore", subject: "OS", definition: "counter used to control access to a shared resource and prevent race conditions" },
  { word: "mutex", subject: "OS", definition: "lock ensuring only one thread enters a critical section at a time" },
  { word: "race condition", subject: "OS", definition: "bug where the result depends on the unpredictable timing of concurrent threads" },
  { word: "context switch", subject: "OS", definition: "saving one process state and loading another so the processor can change what it runs" },
  { word: "file system", subject: "OS", definition: "structure organising files and directories on storage with metadata and permissions" },

  // ---- networks ----
  { word: "network", subject: "Networks", definition: "connected computers exchanging data using protocols over links and routers" },
  { word: "protocol", subject: "Networks", definition: "agreed rules governing how two machines format and exchange messages" },
  { word: "tcp", subject: "Networks", definition: "connection oriented transport protocol giving reliable ordered delivery with acknowledgement" },
  { word: "udp", subject: "Networks", definition: "connectionless transport protocol trading reliability for low latency" },
  { word: "ip address", subject: "Networks", definition: "numeric label identifying a device on a network, used by routers to forward packets" },
  { word: "packet", subject: "Networks", definition: "unit of data sent across a network carrying a header with addressing information" },
  { word: "router", subject: "Networks", definition: "device forwarding packets between networks by consulting a routing table" },
  { word: "dns", subject: "Networks", definition: "system translating human readable domain names into ip addresses" },
  { word: "latency", subject: "Networks", definition: "time a packet takes to travel from source to destination across a network" },
  { word: "firewall", subject: "Networks", definition: "system filtering network traffic against rules to block unauthorised access" },
  { word: "http", subject: "Networks", definition: "application protocol for requesting and sending documents over the web" },

  // ---- security ----
  { word: "encryption", subject: "Security", definition: "transforming data with a key so only holders of the key can read it" },
  { word: "hashing", subject: "Security", definition: "one way function turning data into a fixed size digest that cannot be reversed" },
  { word: "authentication", subject: "Security", definition: "proving who a user is, through a password a passkey or another factor" },
  { word: "authorisation", subject: "Security", definition: "deciding what an authenticated user is permitted to do, enforced by a capability check" },
  { word: "salt", subject: "Security", definition: "random value added before hashing a password so identical passwords differ at rest" },
  { word: "token", subject: "Security", definition: "signed credential a client presents to prove an authenticated session" },
  { word: "vulnerability", subject: "Security", definition: "weakness in a system that an attacker can exploit to break its guarantees" },
  { word: "audit log", subject: "Security", definition: "append only record of who did what and when, used for accountability after an incident" },

  // ---- software engineering ----
  { word: "algorithm", subject: "SE", definition: "finite sequence of well defined steps solving a problem or computing a result" },
  { word: "compiler", subject: "SE", definition: "program translating source code into machine code, performing parsing and optimisation" },
  { word: "debugging", subject: "SE", definition: "finding and removing defects by reproducing a fault and narrowing its cause" },
  { word: "refactoring", subject: "SE", definition: "restructuring code without changing behaviour, to reduce complexity and improve clarity" },
  { word: "unit test", subject: "SE", definition: "automated check of one function in isolation, guarding against regression" },
  { word: "version control", subject: "SE", definition: "system recording changes to code over time so history can be reviewed and reverted" },
  { word: "api", subject: "SE", definition: "defined interface through which one program requests services from another" },
  { word: "abstraction", subject: "SE", definition: "hiding detail behind a simpler interface so callers depend on behaviour not implementation" },
  { word: "inheritance", subject: "SE", definition: "object oriented mechanism where a class takes behaviour from a parent class" },
  { word: "polymorphism", subject: "SE", definition: "same interface behaving differently depending on the underlying object type" },
  { word: "encapsulation", subject: "SE", definition: "keeping data private inside an object and exposing only methods that operate on it" },
  { word: "regression", subject: "SE", definition: "defect reintroducing a previously fixed fault, which automated tests exist to catch" },

  // ---- AI and machine learning ----
  { word: "machine learning", subject: "AI", definition: "fitting a model to data so it can generalise predictions to unseen examples" },
  { word: "neural network", subject: "AI", definition: "layers of weighted connections trained by gradient descent to approximate a function" },
  { word: "training", subject: "AI", definition: "adjusting model parameters to reduce loss on a dataset, using gradient descent" },
  { word: "overfitting", subject: "AI", definition: "model learning noise in training data so it performs worse on unseen examples" },
  { word: "gradient descent", subject: "AI", definition: "optimisation stepping parameters against the gradient of the loss to reduce error" },
  { word: "embedding", subject: "AI", definition: "vector representation placing similar meanings near each other in a numeric space" },
  { word: "classification", subject: "AI", definition: "predicting which category an input belongs to, evaluated by accuracy and recall" },
  { word: "dataset", subject: "AI", definition: "collection of examples used to train and evaluate a model, split into training and test parts" },
  { word: "inference", subject: "AI", definition: "running a trained model on new input to produce a prediction" },
  { word: "hallucination", subject: "AI", definition: "language model stating something fluent and confident that is not supported by its sources" },

  // ---- mathematics ----
  { word: "matrix", subject: "Maths", definition: "rectangular array of numbers supporting multiplication used in transformations and neural networks" },
  { word: "probability", subject: "Maths", definition: "measure between zero and one of how likely an event is to occur" },
  { word: "permutation", subject: "Maths", definition: "arrangement of elements where order matters, counted by factorial expressions" },
  { word: "combination", subject: "Maths", definition: "selection of elements where order does not matter, counted by binomial coefficients" },
  { word: "logarithm", subject: "Maths", definition: "inverse of exponentiation, appearing in the complexity of divide and conquer algorithms" },
  { word: "graph theory", subject: "Maths", definition: "study of vertices and edges, underpinning networks traversal and shortest path problems" },
  { word: "set", subject: "Maths", definition: "unordered collection of distinct elements supporting union intersection and difference" },
  { word: "induction", subject: "Maths", definition: "proof technique establishing a base case then showing each case implies the next" },
  { word: "derivative", subject: "Maths", definition: "rate of change of a function, used in optimisation and gradient descent" },
  { word: "vector", subject: "Maths", definition: "quantity with magnitude and direction, represented as an ordered list of numbers" },
];

export const SUBJECTS = [...new Set(VOCAB.map(t => t.subject))];

export function findTerm(word: string): Term | undefined {
  const w = word.trim().toLowerCase();
  return VOCAB.find(t => t.word === w);
}
