import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type WelcomeEmailProps = {
  name: string;
  imageCid: string;
};

export function WelcomeEmail({ name, imageCid }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome, {name}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Img src={`cid:${imageCid}`} alt={`Welcome, ${name}`} width="640" style={heroImage} />
          </Section>
          <Text style={copy}>Hi {name},</Text>
          <Text style={copy}>
            Welcome. We are glad you are here and excited to help you get started.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  margin: "0",
  padding: "0",
  backgroundColor: "#f6f6f4",
  fontFamily: "Helvetica, Arial, sans-serif",
};

const container = {
  width: "100%",
  maxWidth: "640px",
  margin: "0 auto",
  padding: "32px 20px",
};

const heroImage = {
  display: "block",
  width: "100%",
  maxWidth: "640px",
  height: "auto",
  borderRadius: "6px",
};

const copy = {
  margin: "24px 0 0",
  color: "#1d1d1b",
  fontSize: "16px",
  lineHeight: "24px",
};

