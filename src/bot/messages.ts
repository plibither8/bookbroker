import { markdownv2 as format } from "telegram-format";
import config from "../../config.json";

export const messages = {
  unauthorized: format.escape(
    "❗ You are unauthorized to interact with this bot."
  ),
  onlyFilesAccepted: format.escape("🙏 Please send a MOBI, EPUB or PDF file."),
  documentReceived: (fileName: string) =>
    `${format.bold(format.escape(fileName))}\n${format.escape(
      "📗 Document received!"
    )}`,
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
