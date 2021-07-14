import fetch from "node-fetch";
import {
  createWriteStream,
  createReadStream,
  readFileSync,
  unlinkSync,
} from "fs";
import path from "path";
import api from "./api";
import { extensionMimeTypes } from "./utils";
import config from "../../config.json";
import sgMail from "@sendgrid/mail";
import messages from "./messages";
import FormData from "form-data";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface State {
  messageId: undefined | number;
  messages: string[];
  queue: QueueItem[];
  queued: boolean;
}

interface QueueItem {
  time: number;
  fileName: string;
  filePath: string;
  mimeType: string;
}

const state: State = {
  messageId: undefined,
  messages: [],
  queue: [],
  queued: false,
};

function clearState() {
  state.messageId = undefined;
  state.messages = [];
  state.queue = [];
  state.queued = false;
}

function getContent(document: QueueItem): string {
  return readFileSync(document.filePath).toString("base64");
}

async function emailDocuments(documents: QueueItem[]) {
  const message = {
    to: config.kindleEmail,
    from: config.senderEmail,
    subject: "Documents",
    text: `${documents.length} documents have been attached!`,
    attachments: documents.map((document) => ({
      content: getContent(document),
      filename: document.fileName,
      type: document.mimeType,
      disposition: "attachment",
    })),
  };
  try {
    await sgMail.send(message);
  } catch (err) {
    await api.sendMessage(
      messages.errorInSendingMail(
        JSON.stringify(err.response.body.errors[0], null, 2)
      )
    );
  }
  documents.forEach((document) => unlinkSync(document.filePath));
  await updateMessage(messages.documentDeleted);
}

export async function mailQueue() {
  console.log("Mail queue runner started");
  while (true) {
    if (state.queued) {
      await updateMessage(messages.workingThroughQueue);
      await emailDocuments(state.queue);
      await updateMessage(messages.emailedToDevice);
    }
    clearState();
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

async function downloadFile(
  fileUrl: string,
  fileName: string,
  extension: string
): Promise<string> {
  const targetPath = path.join(
    __dirname,
    "../../temp/",
    `${fileName}.${extension}`
  );
  const response = await fetch(fileUrl);
  const fileStream = createWriteStream(targetPath);
  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);
    response.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
  return targetPath;
}

async function getFilePath(fileId: string): Promise<string> {
  const {
    result: { file_path: localFilePath },
  }: { result: Record<string, string> } = await api.getFile(fileId);
  return `https://api.telegram.org/file/bot${config.bot.token}/${localFilePath}`;
}

async function convertAndDownloadToMobi(
  filePath: string,
  fileName: string
): Promise<string> {
  const form = new FormData();
  form.append("file", createReadStream(filePath));
  form.append("data", JSON.stringify({ convert_to: "kindle" }));
  const response = await fetch("https://epub.to/v1/api", {
    method: "POST",
    body: form,
    headers: {
      Authorization: process.env.EPUB_TO_API_KEY,
      ...form.getHeaders(),
    },
  });
  const targetPath = path.join(__dirname, "../../temp/", `${fileName}.mobi`);
  const fileStream = createWriteStream(targetPath);
  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);
    response.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
  return targetPath;
}

async function updateMessage(message: string) {
  state.messages.push(message);
  if (!state.messageId) {
    state.messageId = (
      await api.sendMessage(messages.documentReceived)
    ).result.message_id;
  } else await api.editMessage(state.messages.join("\n"), state.messageId);
}

export default async function handler(document: any) {
  state.queued = true;
  await updateMessage(messages.documentReceived);
  const fileUrl = await getFilePath(document.file_id);
  let downloadedFilePath = await downloadFile(
    fileUrl,
    document.file_unique_id,
    extensionMimeTypes[document.mime_type]
  );
  await updateMessage(messages.documentDownloaded);
  if (extensionMimeTypes[document.mime_type] === "epub") {
    await updateMessage(messages.mobiConversionStarted);
    const newDownloadedFilePath = await convertAndDownloadToMobi(
      downloadedFilePath,
      document.file_unique_id
    );
    unlinkSync(downloadedFilePath);
    await updateMessage(messages.mobiConversionDone);
    downloadedFilePath = newDownloadedFilePath;
    document.mimeType = "application/x-mobipocket-ebook";
  }
  state.queue.push({
    time: Date.now(),
    fileName: document.file_name,
    filePath: downloadedFilePath,
    mimeType: document.mime_type,
  });
}
