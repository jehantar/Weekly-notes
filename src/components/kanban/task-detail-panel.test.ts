import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "task-detail-panel.tsx"),
  "utf8"
);

test("task description editor remounts when the selected task changes", () => {
  const editorMatch = source.match(/<TaskDescriptionEditor[\s\S]*?\/>/);

  assert.ok(editorMatch, "TaskDetailPanel should render TaskDescriptionEditor");
  assert.match(
    editorMatch[0],
    /key=\{task\.id\}/,
    "TaskDescriptionEditor needs key={task.id} so TipTap does not keep stale content between selected tasks"
  );
});

