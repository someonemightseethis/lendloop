// Single source for n8n Code node scripts. The JavaScript lives in n8n/code/*.js
// (readable, linted, unit-tested); this script writes it into the exported
// workflow JSON. `node scripts/n8n-code.mjs` syncs; tests fail if they drift.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const WORKFLOW_DIR = join(root, "n8n/workflows");
const CODE_DIR = join(root, "n8n/code");

/** workflow file -> Code node name -> { script, signs } (signs: prepend the shared signature module). */
export const CODE_NODES = {
  "request-notification.json": {
    "Verify signature and compose": { script: "verify-request-event.js", signs: true },
  },
  "overdue-reminders.json": {
    "Sign overdue request": { script: "sign-overdue-fetch.js", signs: true },
    "One item per loan": { script: "split-overdue-loans.js", signs: false },
    "Compose reminder": { script: "compose-reminder.js", signs: false },
    "Sign write-back": { script: "sign-reminder-writeback.js", signs: true },
  },
  "error-handler.json": {
    "Sign failure report": { script: "sign-failure-report.js", signs: true },
  },
};

const read = (file) => readFileSync(join(CODE_DIR, file), "utf8").trimEnd();

export function composeNodeCode({ script, signs }) {
  const parts = signs ? [read("signature.js"), "", `// --- ${script} ---`, read(script)] : [read(script)];
  return `${parts.join("\n")}\n`;
}

export function readWorkflow(file) {
  return JSON.parse(readFileSync(join(WORKFLOW_DIR, file), "utf8"));
}

function sync() {
  for (const [file, nodes] of Object.entries(CODE_NODES)) {
    const workflow = readWorkflow(file);
    for (const [name, spec] of Object.entries(nodes)) {
      const node = workflow.nodes.find((n) => n.name === name);
      if (!node) throw new Error(`${file}: no Code node named "${name}"`);
      node.parameters.jsCode = composeNodeCode(spec);
    }
    writeFileSync(join(WORKFLOW_DIR, file), `${JSON.stringify(workflow, null, 2)}\n`);
    console.log(`synced ${file}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) sync();
