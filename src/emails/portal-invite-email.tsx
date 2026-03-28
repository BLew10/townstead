import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PortalInviteEmailProps {
  orgName: string;
  contactName: string;
  inviteUrl: string;
  expiresInDays: number;
}

export function PortalInviteEmail({
  orgName,
  contactName,
  inviteUrl,
  expiresInDays,
}: PortalInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;ve been invited to {orgName}&apos;s client portal</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Client Portal Invitation</Heading>

          <Text style={textStyle}>Hi {contactName},</Text>

          <Text style={textStyle}>
            You&apos;ve been invited to access <strong>{orgName}&apos;s</strong>{" "}
            client portal. From the portal you can view your ads, invoices,
            payments, upload artwork, and communicate with your account manager.
          </Text>

          <Section style={ctaSection}>
            <Button style={buttonStyle} href={inviteUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={noteStyle}>
            This invite expires in {expiresInDays} days. You can sign in or
            create an account with any email address you prefer.
          </Text>

          <Hr style={hrStyle} />

          <Text style={footerStyle}>
            If you weren&apos;t expecting this invitation, you can safely ignore
            this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PortalInviteEmail;

const bodyStyle = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const containerStyle = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const headingStyle = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0 0 20px",
};

const textStyle = {
  color: "#4a4a4a",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const buttonStyle = {
  backgroundColor: "#7c3aed",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const noteStyle = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const hrStyle = {
  borderColor: "#e6e6e6",
  margin: "24px 0",
};

const footerStyle = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0",
};
