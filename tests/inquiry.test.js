import test from "node:test";
import assert from "node:assert/strict";
import { __test__, onRequestPost } from "../functions/api/inquiry.js";

const validPayload = {
  name: "Martin Novak",
  email: "martin@example.pl",
  phone: "+48 573 378 829",
  location: "010 01 Zilina",
  quantity: 2,
  message: "Mam zaujem o cenovu ponuku vratane dopravy.",
  consent: true,
  website: "",
};

test("valid inquiry passes validation", () => {
  const result = __test__.validateInquiry(validPayload);
  assert.deepEqual(result.errors, []);
  assert.equal(result.data.email, "martin@example.pl");
  assert.equal(result.data.quantity, 2);
});

test("invalid email is rejected", () => {
  const result = __test__.validateInquiry({ ...validPayload, email: "bad-email" });
  assert.equal(result.errors.some((error) => error.includes("e-mail")), true);
});

test("missing consent is rejected", () => {
  const result = __test__.validateInquiry({ ...validPayload, consent: false });
  assert.equal(result.errors.some((error) => error.includes("Zgoda")), true);
});

test("honeypot value is rejected", () => {
  const result = __test__.validateInquiry({ ...validPayload, website: "https://spam.example" });
  assert.equal(result.errors.some((error) => error.includes("Spam")), true);
});

test("POST function returns 201 for valid inquiry", async () => {
  const request = new Request("https://example.test/api/inquiry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validPayload),
  });

  const response = await onRequestPost({ request, env: { INQUIRY_LOG_ONLY: "true" } });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.status, "ok");
});

test("POST function returns 422 for invalid inquiry", async () => {
  const request = new Request("https://example.test/api/inquiry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...validPayload, email: "bad" }),
  });

  const response = await onRequestPost({ request, env: {} });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.status, "error");
});

test("POST function returns 201 when delivery is not configured", async () => {
  const request = new Request("https://example.test/api/inquiry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validPayload),
  });

  const response = await onRequestPost({ request, env: {} });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.status, "ok");
});
