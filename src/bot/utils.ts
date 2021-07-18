import path from "path";
import api from "./api";
import config from "../../config.json";
import messages from "./messages";
import { customAlphabet } from "nanoid";
import * as emailValidator from "email-validator";

export interface MessageEntity {
  offset: number;
  length: number;
  type: string;
}

export function createWebhookUrl(): string {
  return `${config.domain}${config.bot.webhookPath}/${config.bot.token}`;
}

export async function isBotInitialised(): Promise<boolean> {
  const {
    result: { url },
  } = await api.getWebhookInfo();
  return Boolean(url === createWebhookUrl());
}

export async function isAuthorized(from: any, text: string): Promise<boolean> {
  const { id, first_name: firstName, is_bot: isBot } = from;
  if (id !== Number(config.bot.chatId)) {
    api.sendMessage(messages.unauthorized, id);
    api.sendMessage(messages.unauthorizedAlert(id, firstName, isBot, text));
    return false;
  }
  return true;
}

export const getTempPath = (fileName: string = ""): string =>
  path.join(__dirname, "../../", "temp", fileName);

export const extensionMimeTypes: Record<string, string> = {
  "application/pdf": "pdf",
  "application/epub+zip": "epub",
  "application/x-mobipocket-ebook": "mobi",
};

export async function isDocument(document: any, from: any): Promise<boolean> {
  const acceptedMimeTypes = Object.keys(extensionMimeTypes);
  if (acceptedMimeTypes.includes(document?.mime_type)) return true;
  await api.sendMessage(messages.onlyFilesAccepted, from.id);
  return false;
}

export const createSenderEmail = (): string => {
  const nanoid = customAlphabet("1234567890abcdef", 7);
  const id = nanoid();
  return `bot_${id}@books.mhr.cx`;
};

export const validateEmail = (text: string): string | undefined => {
  if (text && emailValidator.validate(text) && text.endsWith("kindle.com"))
    return text.trim();
};
