const { hash, compare } = require("bcryptjs");
hash("TestPassword123", 12)
  .then(async h => {
    console.log("hash ok  :", h.slice(0, 25) + "...");
    console.log("compare  :", await compare("TestPassword123", h));
    console.log("wrong pw :", await compare("nope", h));
  })
  .catch(e => console.error("BCRYPT FAILED:", e.message));
