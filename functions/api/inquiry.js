const MAX_LENGTH = {
  name: 80,
  email: 254,
  phone: 40,
  location: 120,
  message: 1500,
  configuration: 1200,
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const cleanText = (value = "") =>
  String(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function buildEmailHtml(data) {
  const rows = [
    ["Imię i nazwisko", data.name],
    ["E-mail", data.email],
    ["Telefon", data.phone || "-"],
    ["Kod pocztowy / miasto", data.location || "-"],
    ["Liczba sztuk", String(data.quantity)],
    ["Konfiguracja", data.configuration || "-"],
    ["Wiadomość", data.message],
  ];

  return `
    <h2>Nowe zapytanie: Zbiornik retencyjny 20 000 l</h2>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><th align="left" style="border-bottom:1px solid #ddd">${escapeHtml(label)}</th><td style="border-bottom:1px solid #ddd">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}
    </table>
  `;
}

function buildEmailText(data) {
  return [
    "Nowe zapytanie: Zbiornik retencyjny 20 000 l",
    "",
    `Imię i nazwisko: ${data.name}`,
    `E-mail: ${data.email}`,
    `Telefon: ${data.phone || "-"}`,
    `Kod pocztowy / miasto: ${data.location || "-"}`,
    `Liczba sztuk: ${data.quantity}`,
    `Konfiguracja: ${data.configuration || "-"}`,
    "",
    "Wiadomość:",
    data.message,
  ].join("\n");
}

function validateInquiry(payload) {
  const data = {
    name: cleanText(payload.name),
    email: cleanText(payload.email).toLowerCase(),
    phone: cleanText(payload.phone),
    location: cleanText(payload.location),
    quantity: Number(payload.quantity || 1),
    configuration: cleanText(payload.configuration),
    message: cleanText(payload.message),
    consent: Boolean(payload.consent),
    website: cleanText(payload.website),
  };

  const errors = [];

  if (data.website) errors.push("Spam protection failed.");
  if (data.name.length < 2 || data.name.length > MAX_LENGTH.name) errors.push("Imię i nazwisko musi mieć od 2 do 80 znaków.");
  if (!isEmail(data.email) || data.email.length > MAX_LENGTH.email) errors.push("Podaj poprawny adres e-mail.");
  if (data.phone.length > MAX_LENGTH.phone) errors.push("Telefon jest zbyt długi.");
  if (data.location.length > MAX_LENGTH.location) errors.push("Kod pocztowy / miasto jest zbyt długie.");
  if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 99) errors.push("Liczba sztuk musi wynosić od 1 do 99.");
  if (data.configuration.length > MAX_LENGTH.configuration) errors.push("Konfiguracja jest zbyt długa.");
  if (data.message.length < 10 || data.message.length > MAX_LENGTH.message) errors.push("Wiadomość musi mieć od 10 do 1500 znaków.");
  if (!data.consent) errors.push("Zgoda na przetwarzanie danych osobowych jest wymagana.");

  return { data, errors };
}

async function sendToWebhook(data, env) {
  if (!env?.INQUIRY_WEBHOOK_URL) return false;

  const response = await fetch(env.INQUIRY_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed with status ${response.status}.`);
  }

  return true;
}

async function sendWithResend(data, env) {
  if (!env?.RESEND_API_KEY) return false;

  if (!env.INQUIRY_TO_EMAIL || !env.INQUIRY_FROM_EMAIL) {
    throw new Error("Resend is configured without recipient or sender email.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.INQUIRY_FROM_EMAIL,
      to: [env.INQUIRY_TO_EMAIL],
      reply_to: data.email,
      subject: `Nowe zapytanie: ${data.name} - zbiornik retencyjny 20 000 l`,
      html: buildEmailHtml(data),
      text: buildEmailText(data),
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed with status ${response.status}.`);
  }

  return true;
}

async function deliverInquiry(data, env) {
  if (env?.INQUIRY_LOG_ONLY === "true") {
    return "log";
  }

  if (await sendToWebhook(data, env)) {
    return "webhook";
  }

  if (await sendWithResend(data, env)) {
    return "email";
  }

  return "noop";
}

export async function onRequestPost({ request, env }) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return json({ status: "error", message: "Nieprawidłowy format żądania." }, 400);
  }

  const { data, errors } = validateInquiry(payload);
  if (errors.length) {
    return json({ status: "error", message: "Sprawdź proszę wypełnione dane.", errors }, 422);
  }

  console.log("New product inquiry", {
    name: data.name,
    email: data.email,
    phone: data.phone,
    location: data.location,
    quantity: data.quantity,
    receivedAt: new Date().toISOString(),
  });

  try {
    const deliveryMode = await deliverInquiry(data, env);
    if (deliveryMode === "noop") {
      console.warn("Inquiry delivery is not configured. Request accepted without forwarding.");
    }
  } catch (error) {
    console.error("Inquiry delivery failed", error);
    return json(
      {
        status: "error",
        message:
          "Formularz został przyjęty, ale wysyłka nie jest skonfigurowana. Sprawdź zmienne środowiskowe Cloudflare.",
      },
      503,
    );
  }

  return json({ status: "ok", message: "Dziękujemy, formularz został wysłany." }, 201);
}

export function onRequestGet() {
  return json({ status: "error", message: "Method not allowed." }, 405);
}

export const __test__ = { buildEmailText, validateInquiry };
