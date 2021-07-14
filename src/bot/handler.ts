import fetch from "node-fetch";
import { createWriteStream, readFileSync, unlinkSync } from "fs";
import path from "path";
import api from "./api";
import { extensionMimeTypes } from "./utils";
import config from "../../config.json";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface QueueItem {
  time: number;
  fileName: string;
  filePath: string;
  mimeType: string;
}

let queue: QueueItem[] = [];

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
    console.log("Mail sent!");
  } catch (err) {
    console.log("Error in sending mail", err.response.body.errors[0]);
  }

  documents.forEach((document) => unlinkSync(document.filePath));
  console.log("Documents deleted");
}

export async function mailQueue() {
  console.log("Mail queue runner started");
  while (true) {
    if (queue.length) {
      console.log("Queue is populated", queue.length);
      await emailDocuments(queue.splice(0));
    }
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

export default async function handler(document: any) {
  console.log("Received document");
  const fileUrl = await getFilePath(document.file_id);
  const downloadedFilePath = await downloadFile(
    fileUrl,
    document.file_unique_id,
    extensionMimeTypes[document.mime_type]
  );
  console.log("Downloaded file locally");
  queue.push({
    time: Date.now(),
    fileName: document.file_name,
    filePath: downloadedFilePath,
    mimeType: document.mime_type,
  });
}
