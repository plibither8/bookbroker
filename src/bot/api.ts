import fetch, { RequestInit } from "node-fetch";
import config from "../../config.json";

interface TgJsonResponse<T = any> {
  ok: boolean;
  result: T;
}
type ApiResponse<T> = Promise<TgJsonResponse<T>>;
type RequestMethod = "GET" | "POST" | "DELETE";

function fetcher<T = any>(
  method: RequestMethod,
  endpoint: string,
  data: unknown = undefined
): ApiResponse<T> {
  const TG_API_BASE = `https://api.telegram.org/bot${config.bot.token}`;
  const requestOptions: RequestInit = { method };
  if (data) {
    requestOptions.body = JSON.stringify(data);
    requestOptions.headers = { "Content-Type": "application/json" };
  }
  return fetch(`${TG_API_BASE}/${endpoint}`, requestOptions).then((res) =>
    res.json()
  );
}

const api = {
  getMe: () => fetcher("GET", "getMe"),
  getWebhookInfo: () => fetcher("GET", "getWebhookInfo"),
  setWebhook: (data: unknown) => fetcher("POST", "setWebhook", data),
  deleteWebhook: () => fetcher("POST", "deleteWebhook"),
  setCommands: (data: unknown) => fetcher("POST", "setMyCommands", data),
  sendMessage: (text: string, chatId?: string | number, options: object = {}) =>
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
    options: object = {}
  ) =>
    fetcher("POST", "editMessageText", {
      text,
      chat_id: chatId || config.bot.chatId,
      message_id: messageId,
      parse_mode: "MarkdownV2",
      ...options,
    }),
  getFile: (fileId: string) => fetcher("POST", "getFile", { file_id: fileId }),
};

export default api;
