import { CHURCH_NAME } from "@/lib/branding";

type SendResult = {
  sent: boolean;
  devPreview?: string;
};

type EmailInput = {
  to: string;
  subject: string;
  html: string;
  label: string;
  devPreview?: string;
};

async function sendEmail({
  to,
  subject,
  html,
  label,
  devPreview,
}: EmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? `${CHURCH_NAME} <no-reply@example.com>`;

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY is not configured; ${label} email to ${to} was not sent.`,
    );
    if (process.env.NODE_ENV !== "production" && devPreview) {
      console.info(`[email] ${label} preview: ${devPreview}`);
    }
    return {
      sent: false,
      devPreview: process.env.NODE_ENV === "production" ? undefined : devPreview,
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      console.error(
        `[email] ${label} failed`,
        response.status,
        await response.text(),
      );
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.error(`[email] ${label} request failed`, error);
    return { sent: false };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<SendResult> {
  let origin = process.env.APP_URL ?? "";
  try {
    origin = new URL(resetUrl).origin;
  } catch {
    // keep APP_URL fallback
  }

  return sendEmail({
    to,
    subject: `Reset your ${CHURCH_NAME} password`,
    label: "password reset",
    devPreview: resetUrl,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F1A17">
        ${origin ? emailLogo(origin) : ""}
        <h2 style="color:#8B1A1A">Reset your password</h2>
        <p>We received a request to reset your password. This link expires in one hour.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#8B1A1A;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">Choose a new password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendRegistrationEmail(
  to: string,
  name: string,
): Promise<SendResult> {
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const loginUrl = origin ? `${origin}/login` : "";
  const safeName = escapeHtml(name);

  return sendEmail({
    to,
    subject: `We received your ${CHURCH_NAME} registration`,
    label: "registration confirmation",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F1A17">
        ${origin ? emailLogo(origin) : ""}
        <h2 style="color:#8B1A1A">Registration received</h2>
        <p>Hi ${safeName},</p>
        <p>Thank you for registering with ${CHURCH_NAME}. Your registration has been received and is awaiting review by our team.</p>
        ${loginUrl ? `<p><a href="${loginUrl}" style="display:inline-block;background:#8B1A1A;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">Sign in to your account</a></p>` : ""}
        <p>If you did not create this account, please contact us.</p>
        <p style="margin-top:24px;color:#6b625c">${CHURCH_NAME}</p>
      </div>
    `,
  });
}

export async function sendProfileUpdateEmail(
  to: string,
  name: string,
): Promise<SendResult> {
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const profileUrl = origin ? `${origin}/member/profile` : "";
  const safeName = escapeHtml(name);

  return sendEmail({
    to,
    subject: `Your ${CHURCH_NAME} profile was updated`,
    label: "profile update confirmation",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F1A17">
        ${origin ? emailLogo(origin) : ""}
        <h2 style="color:#8B1A1A">Profile updated</h2>
        <p>Hi ${safeName},</p>
        <p>Your member profile was updated successfully.</p>
        ${profileUrl ? `<p><a href="${profileUrl}" style="display:inline-block;background:#8B1A1A;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">Review your profile</a></p>` : ""}
        <p>If you did not make this change, please contact us immediately.</p>
        <p style="margin-top:24px;color:#6b625c">${CHURCH_NAME}</p>
      </div>
    `,
  });
}

export async function sendAppointmentEmail(
  to: string,
  subject: string,
  lines: string[],
): Promise<SendResult> {
  const origin = process.env.APP_URL ?? "";

  return sendEmail({
    to,
    subject,
    label: "appointment",
    devPreview: `${subject} - ${lines.join(" ")}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1F1A17">
        ${origin ? emailLogo(origin) : ""}
        <h2 style="color:#8B1A1A">${escapeHtml(subject)}</h2>
        ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        <p style="margin-top:24px;color:#6b625c">${CHURCH_NAME}</p>
      </div>
    `,
  });
}

function emailLogo(baseUrl: string) {
  const src = `${baseUrl.replace(/\/$/, "")}/api/branding/logo`;
  return `<img src="${src}" alt="${escapeHtml(CHURCH_NAME)}" width="56" height="56" style="display:block;border-radius:14px;margin-bottom:16px" />`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
