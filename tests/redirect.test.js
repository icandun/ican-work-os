import assert from "node:assert/strict";
import test from "node:test";

import worker from "../worker/index.js";

const env = {
  ASSETS: {
    fetch() {
      return new Response("legacy asset");
    },
  },
};

test("redirects the legacy app root to unified Work", async () => {
  const response = await worker.fetch(new Request("https://ican-work-os.icandun.workers.dev/"), env);

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://habit-ican.pages.dev/work/");
});

test("keeps API routes on the legacy Worker", async () => {
  const response = await worker.fetch(new Request("https://ican-work-os.icandun.workers.dev/api/health"), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "ican-sync-cloud" });
});

test("continues serving non-navigation assets", async () => {
  const response = await worker.fetch(new Request("https://ican-work-os.icandun.workers.dev/styles.css"), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "legacy asset");
});
