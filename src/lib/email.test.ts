import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEmailFrom, sendEmail } from "@/lib/email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("email provider", () => {
  it("parses display name and address", () => {
    expect(parseEmailFrom("Wareflow <no-reply@example.com>")).toEqual({
      name: "Wareflow",
      email: "no-reply@example.com",
    });
    expect(parseEmailFrom("no-reply@example.com")).toEqual({ email: "no-reply@example.com" });
  });

  it("sends through Brevo when BREVO_API_KEY is set", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "Wareflow <no-reply@example.com>");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messageId: "msg-1" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({ to: "user@example.com", subject: "Kode", text: "123456" });

    expect(result).toEqual({ provider: "brevo", id: "msg-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers).toMatchObject({ "api-key": "test-key" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      sender: { email: "no-reply@example.com", name: "Wareflow" },
      to: [{ email: "user@example.com" }],
      subject: "Kode",
      textContent: "123456",
    });
  });

  it("throws when the provider rejects the message", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "Wareflow <no-reply@example.com>");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })));

    await expect(
      sendEmail({ to: "user@example.com", subject: "Kode", text: "123456" }),
    ).rejects.toThrow("EMAIL_DELIVERY_FAILED");
  });
});
