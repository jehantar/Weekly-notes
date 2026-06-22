import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node 25 can run this TypeScript test with an explicit .ts specifier.
import { parseViewTab, VIEW_TABS } from "./views.ts";

test("primary tabs are ordered Notes, Board, Screenshots", () => {
  assert.deepEqual(
    VIEW_TABS.map((tab) => [tab.value, tab.label]),
    [
      ["notes", "Notes"],
      ["tasks", "Board"],
      ["screenshots", "Screenshots"],
    ]
  );
});

test("removed Updates URLs fall back to Board", () => {
  assert.equal(parseViewTab("updates"), "tasks");
  assert.equal(parseViewTab("notes"), "notes");
  assert.equal(parseViewTab("screenshots"), "screenshots");
  assert.equal(parseViewTab(null), "tasks");
});
