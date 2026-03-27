import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { formatCurrency } from "@/lib/utils";

interface StatementEmailProps {
  contactName: string;
  companyName: string;
  overallBalance: number;
  purchaseCount: number;
}

export function StatementEmail({
  contactName,
  companyName,
  overallBalance,
  purchaseCount,
}: StatementEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Account Statement — {companyName}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Account Statement</Heading>

          <Text style={textStyle}>Dear {contactName},</Text>

          <Text style={textStyle}>
            Please find attached your account statement for {companyName}.
            This statement includes {purchaseCount} purchase
            {purchaseCount !== 1 ? "s" : ""} and a complete payment history.
          </Text>

          <Section style={summaryStyle}>
            <Text style={summaryLabelStyle}>Current Balance</Text>
            <Text style={summaryAmountStyle}>
              {formatCurrency(overallBalance)}
            </Text>
          </Section>

          <Text style={textStyle}>
            The full statement PDF is attached to this email for your records.
            If you have any questions or need clarification, please contact us.
          </Text>

          <Hr style={hrStyle} />

          <Text style={footerStyle}>
            This is an automated message. Please do not reply directly to this
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default StatementEmail;

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

const summaryStyle = {
  backgroundColor: "#f8f9fa",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const summaryLabelStyle = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px",
};

const summaryAmountStyle = {
  color: "#1a1a1a",
  fontSize: "32px",
  fontWeight: "700" as const,
  margin: "0",
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
