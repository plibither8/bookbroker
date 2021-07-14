import { markdownv2 as format } from "telegram-format";
import config from "../../config.json";

export const messages = {
  unauthorized: format.escape(
    "❗You are unauthorized to interact with this bot."
  ),
  documentReceived: (fileName: string) =>
    `${format.bold(format.escape(fileName))}\n${format.escape(
      "📗 Document received!"
    )}`,
  documentDownloaded: format.escape("📂 Document downloaded locally"),
  onlyFilesAccepted: format.escape("🙏 Please send a MOBI, EPUB or PDF file."),
  workingThroughQueue: format.escape("🔧 Working through the queue..."),
  emailedToDevice: format.bold(
    format.escape("🎉 Emailed to your device, enjoy!")
  ),
  errorInSendingMail: (err: string): string =>
    format.escape(`❗Error in sending message!\n\n${err}`),
  mobiConversionStarted: format.escape("🔄 Converting EPUB file to MOBI..."),
  mobiConversionDone: format.escape("✅ Conversion done"),
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
