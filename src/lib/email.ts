export type EmailProvider = "brevo" | "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailSender = {
  email: string;
  name?: string;
};

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("EMAIL_NOT_CONFIGURED");
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(
    readonly provider: EmailProvider,
    readonly status: number,
  ) {
    super("EMAIL_DELIVERY_FAILED");
    this.name = "EmailDeliveryError";
  }
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

export function parseEmailFrom(value: string): EmailSender {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*?)\s*<([^<>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, "");
    return { email: match[2].trim(), ...(name ? { name } : {}) };
  }
  return { email: trimmed };
}

export function getEmailProvider(): EmailProvider | null {
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

export function isEmailConfigured() {
  const provider = getEmailProvider();
  if (provider === "brevo") return Boolean(process.env.EMAIL_FROM?.trim());
  return Boolean(provider);
}

export async function sendEmail(message: EmailMessage): Promise<{ provider: EmailProvider; id: string | null }> {
  const provider = getEmailProvider();
  if (!provider) throw new EmailNotConfiguredError();

  const rawFrom = process.env.EMAIL_FROM?.trim();
  if (provider === "brevo" && !rawFrom) throw new EmailNotConfiguredError();
  const sender = parseEmailFrom(rawFrom || "Wareflow <onboarding@resend.dev>");

  if (provider === "brevo") return sendWithBrevo(sender, message);
  return sendWithResend(sender, message);
}

async function sendWithBrevo(sender: EmailSender, message: EmailMessage) {
  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY ?? "",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: sender.email, ...(sender.name ? { name: sender.name } : {}) },
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      ...(message.html ? { htmlContent: message.html } : {}),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!response.ok) throw new EmailDeliveryError("brevo", response.status);
  const data = (await response.json().catch(() => null)) as { messageId?: string } | null;
  return { provider: "brevo" as const, id: data?.messageId ?? null };
}

async function sendWithResend(sender: EmailSender, message: EmailMessage) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender.name ? `${sender.name} <${sender.email}>` : sender.email,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!response.ok) throw new EmailDeliveryError("resend", response.status);
  const data = (await response.json().catch(() => null)) as { id?: string } | null;
  return { provider: "resend" as const, id: data?.id ?? null };
}
