#!/usr/bin/env node
// Finds query keys used in more than one route file.
// Many duplicates are intentional (same select shape shared across pages) — that's fine.
// The goal is to surface NEW collisions where two files use the same key with different selects.
const { execSync } = require("child_process");

const out = execSync("grep -rn 'queryKey: \\[' src/routes/").toString();

// Build a map of key → unique files[]
const keyFiles = {};
for (const line of out.split("\n")) {
  const fileMatch = line.match(/^(src\/routes\/[^:]+):\d+:/);
  const keyMatch  = line.match(/queryKey:\s*\["([^"]+)"/);
  if (!fileMatch || !keyMatch) continue;
  const file = fileMatch[1];
  const key  = keyMatch[1];
  if (!keyFiles[key]) keyFiles[key] = [];
  if (!keyFiles[key].includes(file)) keyFiles[key].push(file);
}

const dups = Object.entries(keyFiles).filter(([, files]) => files.length > 1);

if (dups.length === 0) {
  console.log("No duplicate query keys.");
  process.exit(0);
}

console.log("Query keys used in multiple files — verify select shapes are identical:\n");
for (const [key, files] of dups.sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  "${key}"`);
  files.forEach((f) => console.log(`    ${f}`));
}
console.log("\nIf select() shapes differ across files, rename the partial-shape key to \"<name>-basic\".");
