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

export type EmailTemplateProps = {
  recipientName: string;
  bodyText: string;
  imageCid: string;
  // Used as the hero image's alt text. Email clients block images by default,
  // so this is what most recipients see until they load images.
  imageAlt: string;
};

export function EmailTemplate({
  recipientName,
  bodyText,
  imageCid,
  imageAlt,
}: EmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>{bodyText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section>
            <Img
              src={`cid:${imageCid}`}
              alt={imageAlt}
              width="640"
              style={heroImage}
            />
          </Section>
          <Text style={copy}>Hi {recipientName},</Text>
          <Text style={copy}>{bodyText}</Text>
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

