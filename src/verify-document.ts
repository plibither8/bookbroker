import fetch from "node-fetch";
import { Form } from "multiparty";
import { SEND_TO_KINDLE, VERIFICATION_FAILURE_LINE } from "./constants";

async function getMailFields(req: any): Promise<Record<string, string>> {
  const form = new Form();
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields) => {
      if (err) return reject(err);
      for (const field in fields) fields[field] = fields[field][0];
      resolve(fields);
    });
  });
}

async function parseUrlFromFields(
  fields: Record<string, string>
): Promise<string> {
  const urlLine = fields.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => line.includes(SEND_TO_KINDLE));
  const ctaUrl = urlLine.substring(1, urlLine.length - 1);
  const { searchParams } = new URL(ctaUrl);
  return searchParams.get("U");
}

function verifySender(fields: Record<string, string>): boolean {
  return fields.from?.includes("do-not-reply@amazon.com");
}

export async function verifyDocument(req: any): Promise<boolean> {
  const mailFields = await getMailFields(req);
  console.log("Fields parsed");
  if (!verifySender(mailFields)) {
    console.log("Sender verification failed", mailFields.from);
    return false;
  }
  const verificationUrl = await parseUrlFromFields(mailFields);
  const response = await fetch(verificationUrl);
  const html = (await response.text()) as string;
  console.log("Fetched verification URL");
  return !html.includes(VERIFICATION_FAILURE_LINE);
}
