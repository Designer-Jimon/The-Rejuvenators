type SendResult = {
  sent: boolean;
  devPreview?: string;
};

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "IT IS FINISHED <no-reply@example.com>";

  if (!apiKey) {
    console.log(`[password-reset] ${to}: ${resetUrl}`);
    return {
      sent: false,
      devPreview: process.env.NODE_ENV === "production" ? undefined : resetUrl,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your IT IS FINISHED REVIVAL OUTREACH password",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F1A17">
          <h2 style="color:#8B1A1A">Reset your password</h2>
          <p>We received a request to reset your password. This link expires in one hour.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#8B1A1A;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">Choose a new password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    console.error("Resend email failed", response.status, await response.text());
    return { sent: false };
  }

  return { sent: true };
}
