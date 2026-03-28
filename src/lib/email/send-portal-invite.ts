import { getResend, EMAIL_FROM } from "./resend";
import { PortalInviteEmail } from "@/emails/portal-invite-email";
import { render } from "@react-email/components";

interface SendPortalInviteParams {
  to: string;
  orgName: string;
  contactName: string;
  inviteUrl: string;
  expiresInDays: number;
}

export async function sendPortalInviteEmail(params: SendPortalInviteParams) {
  const html = await render(
    PortalInviteEmail({
      orgName: params.orgName,
      contactName: params.contactName,
      inviteUrl: params.inviteUrl,
      expiresInDays: params.expiresInDays,
    })
  );

  const resend = getResend();
  await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `You've been invited to ${params.orgName}'s client portal`,
    html,
  });
}
