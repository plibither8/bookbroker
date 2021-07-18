import { markdownv2 as format } from "telegram-format";
import config from "../../config.json";

export const messages = {
  unauthorized: format.escape(
    "❗ You are unauthorized to interact with this bot."
  ),
  onlyPrivateChats: `${format.escape(
    `⚠️ I only work on private chats for now, DM me to get started!`
  )}\n${format.bold(format.escape("@kindle_joy_bot"))}`,
  initialization: (email: string): [string, any] => [
    `${format.escape(
      `👋 Hi, this friendly bot is at your service! But first, let's set you up!\n
Add the following email to your "Approved Personal Document E-mail List". Check out `
    )}${format.url(
      format.escape("Amazon's help page"),
      "https://www.amazon.com/gp/help/customer/display.html?nodeId=GX9XLEVV8G4DB28H"
    )} ${format.escape(
      "for instructions on how to.\n\n📧: "
    )} ${format.monospace(email)}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: format.escape("✅ I've approved this email"),
              callback_data: "email_approved",
            },
          ],
        ],
      },
    },
  ],
  senderEmailYetToApprove: (email: string): [string, any] => [
    `${format.escape(
      `🤔 Seems like you still haven't approved the email under "Approved Personal Document E-mail List". Check out `
    )}${format.url(
      format.escape("Amazon's help page"),
      "https://www.amazon.com/gp/help/customer/display.html?nodeId=GX9XLEVV8G4DB28H"
    )} ${format.escape(
      "for instructions on how to.\n\n📧: "
    )} ${format.monospace(email)}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: format.escape("✅ I've approved this email"),
              callback_data: "email_approved",
            },
          ],
        ],
      },
    },
  ],
  invalidSenderEmail: `${format.escape(
    "😞 This seems to be an invalid Send-To-Kindle email ID. Make sure it ends with"
  )} ${format.monospace("kindle.com")}`,
  onlyFilesAccepted: format.escape("🙏 Please send a MOBI, EPUB or PDF file."),
  documentReceived: (fileName: string) =>
    `${format.bold(format.escape(fileName))}\n${format.escape(
      "📗 Document received!"
    )}`,
  requestKindleEmail: `${format.escape("📨 Now send me")} ${format.bold(
    format.escape("your Send-To-Kindle email")
  )}${format.escape(". It's the one that ends with")} ${format.monospace(
    "kindle.com"
  )}`,
  botReady: format.escape(
    "✅ Perfecto, we're all set! Just send me the document (upload, forward, drag-n-drop), and I'll send it to your Kindle 😉"
  ),
  gettingFileInformation: format.escape("ℹ️ Getting file information..."),
  fileInformationReceived: format.escape("ℹ️ Received file information"),
  downloadingDocument: format.escape("📂 Downloading document..."),
  documentDownloaded: format.escape("📂 Document downloaded locally"),
  emailingToDevice: format.escape("📧 Emailing the book to your device..."),
  emailedToDevice: format.bold(
    format.escape("🎉 Emailed to your device, enjoy!")
  ),
  errorInSendingMail: (err: string): string =>
    `${format.bold(
      format.escape("❗ Error in sending email!")
    )}\n${format.escape(err)}`,
  mobiConversionStarted: format.escape("🔄 Converting EPUB file to MOBI..."),
  mobiConversionDone: format.escape("✅ Book converted from EPUB to MOBI"),
  reinitialisedBot: (): string =>
    format.escape(`♻️ Re-initialized bot with new domain: ${config.domain}`),
  unauthorizedAlert: (
    id: number,
    firstName: string,
    isBot: boolean,
    text: string
  ): string =>
    format.escape(
      `🚨 Unauthorized attempt!\nID: ${id}\nFirst name: ${firstName}\nBot? ${
        isBot ? "Yes" : "No"
      }\nText: ${text}`
    ),
};

export default messages;
