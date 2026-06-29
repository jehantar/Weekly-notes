import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "create-week-modal.tsx"),
  "utf8"
);

test("creating a week preserves user-scoped screenshots already in provider state", () => {
  assert.match(
    source,
    /const\s*\{\s*setWeekData,\s*screenshots\s*\}\s*=\s*useWeek\(\)/,
    "CreateWeekModal should read existing screenshots from WeekProvider"
  );
  assert.doesNotMatch(
    source,
    /screenshots:\s*\[\]/,
    "CreateWeekModal must not clear screenshots when creating a week"
  );
  assert.match(
    source,
    /screenshots,(\s|\n)*\}/,
    "setWeekData should carry forward existing screenshots"
  );
});

