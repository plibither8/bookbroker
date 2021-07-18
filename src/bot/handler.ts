import { workerData } from "worker_threads";
import { spawnSync } from "child_process";
import {
  createWriteStream,
  readFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from "fs";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import api from "./api";
import { extensionMimeTypes, getTempPath } from "./utils";
import config from "../../config.json";
import sgMail from "@sendgrid/mail";
import messages from "./messages";
import { EBOOK_CONVERT_BIN_PATH } from "../constants";

// Initialise SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Create a temp directory if it already doesn't exist
// Here we will store the downloaded/converted files for a while
if (!existsSync(getTempPath())) {
  mkdirSync(getTempPath());
}

interface State {
  messageId: undefined | number;
  messages: string[];
}

async function updateMessage(
  message: string,
  state?: State,
  popLastMessage: boolean = false
): Promise<State> {
  state ??= { messageId: undefined, messages: [] };
  if (popLastMessage) state.messages.pop();
  state.messages.push(message);
  if (!state.messageId)
    state.messageId = (await api.sendMessage(message)).result.message_id;
  else await api.editMessage(state.messages.join("\n"), state.messageId);
  return state;
}

async function getFilePath(fileId: string): Promise<string> {
  const file = await api.getFile(fileId);
  return api.getFilePath(file.result.file_path);
}

async function downloadFile(
  fileUrl: string,
  extension: string
): Promise<string> {
  const targetPath = getTempPath(`${uuidv4()}.${extension}`);
  const response = await fetch(fileUrl);
  const fileStream = createWriteStream(targetPath);
  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);
    response.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
  return targetPath;
}

async function emailDocument(
  fileName: string,
  filePath: string,
  mimeType: string
): Promise<string | undefined> {
  // Force-add the proper extension to the filename, otherwise
  // Kindle rejects it
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
  let errorMessage = undefined;
  try {
    await sgMail.send(message);
  } catch (err) {
    errorMessage = err.response.body.errors
      .map((error) => error.message)
      .join("\n");
  }
  // Delete the file downloaded/converted file
  unlinkSync(filePath);
  return errorMessage;
}

export default async function handler(document: any) {
  let { file_id: fileId, file_name: fileName, mime_type: mimeType } = document;
  const state = await updateMessage(
    messages.documentReceived(fileName),
    undefined
  );
  await updateMessage(messages.gettingFileInformation, state);
  const fileUrl = await getFilePath(fileId);
  await updateMessage(messages.fileInformationReceived, state, true);
  await updateMessage(messages.downloadingDocument, state);
  let downloadedFilePath = await downloadFile(
    fileUrl,
    extensionMimeTypes[mimeType]
  );
  await updateMessage(messages.documentDownloaded, state, true);
  if (extensionMimeTypes[mimeType] === "epub") {
    await updateMessage(messages.mobiConversionStarted, state);
    const newDownloadedFilePath = getTempPath(`${uuidv4()}.mobi`);
    spawnSync(EBOOK_CONVERT_BIN_PATH, [
      downloadedFilePath,
      newDownloadedFilePath,
    ]);
    unlinkSync(downloadedFilePath);
    await updateMessage(messages.mobiConversionDone, state, true);
    downloadedFilePath = newDownloadedFilePath;
    mimeType = "application/x-mobipocket-ebook";
  }
  await updateMessage(messages.emailingToDevice, state);
  const emailError = await emailDocument(
    fileName,
    downloadedFilePath,
    mimeType
  );
  await updateMessage(
    emailError
      ? messages.errorInSendingMail(emailError)
      : messages.emailedToDevice,
    state,
    true
  );
}

// If we are running a worker thread, then invoke
// handler with workerData
if (workerData) {
  handler(workerData.document);
}
