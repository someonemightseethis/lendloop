import { describe, expect, it } from "vitest";
import { CODE_NODES, composeNodeCode, readWorkflow } from "../scripts/n8n-code.mjs";

type Node = { name: string; type: string; parameters: Record<string, unknown>; retryOnFail?: boolean; credentials?: Record<string, object> };
type Workflow = { id: string; nodes: Node[]; settings: { errorWorkflow?: string; saveDataSuccessExecution?: string } };

const FILES = Object.keys(CODE_NODES);
const workflows = Object.fromEntries(FILES.map((file) => [file, readWorkflow(file) as Workflow]));
const errorHandlerId = workflows["error-handler.json"].id;

describe("exported n8n workflows", () => {
  it.each(FILES)("%s runs exactly the tested Code node sources", (file) => {
    for (const [name, spec] of Object.entries(CODE_NODES[file as keyof typeof CODE_NODES])) {
      const node = workflows[file].nodes.find((n) => n.name === name);
      expect(node?.parameters.jsCode, `${file} > ${name} is out of sync; run npm run n8n:sync`).toBe(composeNodeCode(spec));
    }
  });

  it.each(["request-notification.json", "overdue-reminders.json"])("%s reports failures to the error workflow", (file) => {
    expect(workflows[file].settings.errorWorkflow).toBe(errorHandlerId);
  });

  it.each(FILES)("%s retries every network step and keeps no success data", (file) => {
    const network = workflows[file].nodes.filter((n) => /httpRequest|emailSend/.test(n.type));
    expect(network.length).toBeGreaterThan(0);
    for (const node of network) expect(node.retryOnFail, node.name).toBe(true);
    expect(workflows[file].settings.saveDataSuccessExecution).toBe("none");
  });

  it.each(FILES)("%s contains no secrets or credential data", (file) => {
    const text = JSON.stringify(workflows[file]);
    expect(text).not.toMatch(/[0-9a-f]{32,}/i);
    for (const node of workflows[file].nodes) {
      for (const ref of Object.values(node.credentials ?? {})) expect(Object.keys(ref).sort()).toEqual(["id", "name"]);
    }
  });

  it("verifies webhook signatures over the raw body", () => {
    const webhook = workflows["request-notification.json"].nodes.find((n) => n.type === "n8n-nodes-base.webhook");
    expect(webhook?.parameters).toMatchObject({ httpMethod: "POST", responseMode: "responseNode", options: { rawBody: true } });
  });
});
