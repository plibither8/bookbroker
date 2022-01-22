import got from "got";
import config from "../../config.js";

interface TgJsonResponse<T = any> {
  ok: boolean;
  result: T;
}
type ApiResponse<T> = Promise<TgJsonResponse<T>>;
type RequestMethod = "GET" | "POST" | "DELETE";

const TG_API_BASE = `https://api.telegram.org/bot${config.bot.token}`;

const fetcher = <T = any>(
  method: RequestMethod,
  endpoint: string,
  data: unknown = undefined
): ApiResponse<T> =>
  got(`${TG_API_BASE}/${endpoint}`, {
    method,
    json: data,
  }).json();

const api = {
  getMe: () => fetcher("GET", "getMe"),
  getWebhookInfo: () => fetcher("GET", "getWebhookInfo"),
  setWebhook: (data: unknown) => fetcher("POST", "setWebhook", data),
  deleteWebhook: () => fetcher("POST", "deleteWebhook"),
  setCommands: (data: unknown) => fetcher("POST", "setMyCommands", data),
  sendMessage: (text: string, chatId?: string | number, options: any = {}) =>
    fetcher("POST", "sendMessage", {
      text,
      chat_id: chatId || config.bot.chatId,
      parse_mode: "MarkdownV2",
      ...options,
    }),
  editMessage: (
    text: string,
    messageId: string | number,
    chatId?: string | number,
    options: any = {}
  ) =>
    fetcher("POST", "editMessageText", {
      text,
      chat_id: chatId || config.bot.chatId,
      message_id: messageId,
      parse_mode: "MarkdownV2",
      ...options,
    }),
  getFile: (fileId: string) => fetcher("POST", "getFile", { file_id: fileId }),
  getFilePath: (localFilePath: string) =>
    `https://api.telegram.org/file/bot${config.bot.token}/${localFilePath}`,
};

export default api;
