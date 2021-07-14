import fetch from "node-fetch";
import {
  createWriteStream,
  readFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from "fs";
import path from "path";
import api from "./api";
import { extensionMimeTypes } from "./utils";
import config from "../../config.json";
import sgMail from "@sendgrid/mail";
import messages from "./messages";
import { spawnSync } from "child_process";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const getTempPath = (fileName: string = ""): string =>
  path.join(__dirname, "../../", "temp", fileName);

if (!existsSync(getTempPath())) {
  mkdirSync(getTempPath());
}

interface State {
  messageId: undefined | number;
  messages: string[];
}

async function emailDocument(
  fileName: string,
  filePath: string,
  mimeType: string
) {
  const fileNameWithExt = `${fileName}.${extensionMimeTypes[mimeType]}`;
  const message = {
    to: config.kindleEmail,
    from: config.senderEmail,
    subject: "Sending book...",
    text: `A book "${fileNameWithExt}" documents have been attached!`,
    attachments: [
      {
        content: readFileSync(filePath).toString("base64"),
        filename: fileNameWithExt,
        type: mimeType,
        disposition: "attachment",
      },
    ],
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
  unlinkSync(filePath);
}

async function downloadFile(
  fileUrl: string,
  fileName: string,
  extension: string
): Promise<string> {
  const targetPath = path.join(`${fileName}.${extension}`);
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

async function updateMessage(
  message: string,
  state?: State,
  createState: boolean = false
): Promise<State> {
  state ??= {
    messageId: undefined,
    messages: [],
  };
  state.messages.push(message);
  if (!state.messageId) {
    state.messageId = (await api.sendMessage(message)).result.message_id;
  } else await api.editMessage(state.messages.join("\n"), state.messageId);
  return state;
}

export default async function handler(document: any) {
  let {
    file_id: fileId,
    file_unique_id: fileUniqueId,
    file_name: fileName,
    mime_type: mimeType,
  } = document;
  const state = await updateMessage(
    messages.documentReceived(fileName),
    undefined,
    true
  );
  const fileUrl = await getFilePath(fileId);
  let downloadedFilePath = await downloadFile(
    fileUrl,
    fileUniqueId,
    extensionMimeTypes[mimeType]
  );
  await updateMessage(messages.documentDownloaded, state);
  if (extensionMimeTypes[mimeType] === "epub") {
    await updateMessage(messages.mobiConversionStarted, state);
    const newDownloadedFilePath = getTempPath(`${fileUniqueId}.mobi`);
    spawnSync("/usr/bin/ebook-convert", [
      downloadedFilePath,
      newDownloadedFilePath,
    ]);
    unlinkSync(downloadedFilePath);
    await updateMessage(messages.mobiConversionDone, state);
    downloadedFilePath = newDownloadedFilePath;
    mimeType = "application/x-mobipocket-ebook";
  }
  await emailDocument(fileName, downloadedFilePath, mimeType);
  await updateMessage(messages.emailedToDevice, state);
}
