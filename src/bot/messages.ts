import { markdownv2 as format } from "telegram-format";
import config from "../../config.json";

export const messages = {
  unauthorized: format.escape(
    "You are unauthorized to interact with this bot."
  ),
  onlyFilesAccepted: format.escape("Please send a MOBI, EPUB or PDF file."),
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
