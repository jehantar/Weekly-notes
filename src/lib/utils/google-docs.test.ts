import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node 25 can run this TypeScript test with an explicit .ts specifier.
import { buildGoogleDocAttachment, extractGoogleDocFileId } from "./google-docs.ts";

test("extractGoogleDocFileId reads standard Google Docs URLs", () => {
  assert.equal(
    extractGoogleDocFileId("https://docs.google.com/document/d/1AbC_def-ghi1234567890/edit?tab=t.0"),
    "1AbC_def-ghi1234567890"
  );
});

test("extractGoogleDocFileId reads Drive open URLs", () => {
  assert.equal(
    extractGoogleDocFileId("https://drive.google.com/open?id=1AbC_def-ghi1234567890"),
    "1AbC_def-ghi1234567890"
  );
});

test("extractGoogleDocFileId returns null for non-Google Docs input", () => {
  assert.equal(extractGoogleDocFileId("https://example.com/doc"), null);
  assert.equal(extractGoogleDocFileId(""), null);
});

test("buildGoogleDocAttachment creates an attachment from only a URL", () => {
  assert.deepEqual(
    buildGoogleDocAttachment("  https://docs.google.com/document/d/1AbC_def-ghi1234567890/edit  "),
    {
      sourceUrl: "https://docs.google.com/document/d/1AbC_def-ghi1234567890/edit",
      sourceFileId: "1AbC_def-ghi1234567890",
    }
  );
});

test("buildGoogleDocAttachment rejects non-Google Doc URLs", () => {
  assert.equal(buildGoogleDocAttachment("https://example.com/doc"), null);
  assert.equal(
    buildGoogleDocAttachment("https://example.com/open?id=1AbC_def-ghi1234567890"),
    null
  );
});
