const fs = require("fs");
const line = fs.readFileSync(".env", "utf8").split(/\r?\n/).find(l => l.startsWith("GEMINI_API_KEY"));
const key = line ? line.split("=")[1].replace(/^"|"$/g, "").trim() : "";
if (!key) { console.log("No GEMINI_API_KEY in frontend/.env"); process.exit(1); }

fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + key)
  .then(r => r.json())
  .then(d => {
    if (d.error) { console.log("API error:", d.error.message); return; }
    const m = d.models || [];
    console.log("--- EMBEDDING models ---");
    m.filter(x => (x.supportedGenerationMethods || []).includes("embedContent"))
     .forEach(x => console.log("  " + x.name.replace("models/", "")));
    console.log("--- CHAT models (flash only) ---");
    m.filter(x => (x.supportedGenerationMethods || []).includes("generateContent") && x.name.includes("flash"))
     .forEach(x => console.log("  " + x.name.replace("models/", "")));
  })
  .catch(e => console.log("Request failed:", e.message));
