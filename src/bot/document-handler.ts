import type { User } from "@prisma/client";
import sgMail from "@sendgrid/mail";
import { spawnSync } from "child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from "fs";
import got from "got";
import { nanoid } from "nanoid";
import stream from "stream";
import { promisify } from "util";
import { workerData } from "worker_threads";
import { EBOOK_CONVERT_BIN_PATH } from "../libs/constants.js";
import db from "../libs/database.js";
import api from "./api.js";
import messages from "./messages.js";
import { getUsageInfo } from "./user.js";
import { extensionMimeTypes, getTempPath } from "./utils.js";

interface State {
  messageId: undefined | number;
  messages: string[];
  chatId: string;
}

// Initialise SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Create a temp directory if it already doesn't exist
// Here we will store the downloaded/converted files for a while
if (!existsSync(getTempPath())) {
  mkdirSync(getTempPath());
}

async function updateMessage(
  message: string,
  state?: State,
  popLastMessage: boolean = false,
  chatId?: string
): Promise<State> {
  state ??= { messageId: undefined, messages: [], chatId };
  if (popLastMessage) state.messages.pop();
  state.messages.push(message);
  if (!state.messageId)
    state.messageId = (
      await api.sendMessage(message, state.chatId)
    ).result.message_id;
  else
    await api.editMessage(
      state.messages.join("\n"),
      state.messageId,
      state.chatId
    );
  return state;
}

async function getFilePath(fileId: string): Promise<string | boolean> {
  const file = await api.getFile(fileId);
  if (file.result.file_size > 20 * 1024 * 1024) return false;
  return api.getFilePath(file.result.file_path);
}

const pipeline = promisify(stream.pipeline);

async function downloadFile(
  fileUrl: string,
  extension: string
): Promise<string> {
  const targetPath = getTempPath(`${nanoid()}.${extension}`);
  await pipeline(got.stream(fileUrl), createWriteStream(targetPath));
  return targetPath;
}

async function emailDocument(
  user: User,
  fileName: string,
  filePath: string,
  mimeType: string
): Promise<string | undefined> {
  // Force-add the proper extension to the filename, otherwise
  // Kindle rejects it
  const fileNameWithExt = `${fileName}.${extensionMimeTypes[mimeType]}`;
  const message = {
    to: user.kindleEmail,
    from: user.senderEmail,
    subject: "Sending book...",
    text: `A document "${fileNameWithExt}" has been attached!`,
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
    if (!process.env.DEV) await sgMail.send(message);
  } catch (err) {
    errorMessage = err.response.body.errors
      .map((error) => error.message)
      .join("\n");
  }
  // Delete the file downloaded/converted file
  unlinkSync(filePath);
  return errorMessage;
}

export default async function documentHandler(user: User, document: any) {
  let { file_id: fileId, file_name: fileName, mime_type: mimeType } = document;
  const originalFileExtension = extensionMimeTypes[mimeType];
  const shouldConvert = originalFileExtension === "epub";
  await db.delivery.create({
    data: {
      userId: user.id,
      fileType: originalFileExtension,
      fileId,
      fileName,
      converted: shouldConvert,
    },
  });
  const { deliveriesToday, dailyDeliveryLimit } = await getUsageInfo(user);
  if (deliveriesToday > dailyDeliveryLimit) {
    await api.sendMessage(
      await messages.deliveryLimitReached(user),
      user.chatId
    );
    return;
  }

  const state = await updateMessage(
    messages.documentReceived(fileName),
    undefined,
    false,
    user.chatId
  );

  await updateMessage(messages.gettingFileInformation, state);
  const fileUrl = await getFilePath(fileId);
  if (!fileUrl) {
    await updateMessage(messages.fileSizeLimit, state, true);
    return;
  }
  await updateMessage(messages.fileInformationReceived, state, true);

  await updateMessage(messages.downloadingDocument, state);
  let downloadedFilePath = await downloadFile(
    fileUrl as string,
    originalFileExtension
  );
  await updateMessage(messages.documentDownloaded, state, true);
  if (shouldConvert) {
    await updateMessage(messages.mobiConversionStarted, state);
    const newDownloadedFilePath = getTempPath(`${nanoid()}.mobi`);
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
    user,
    fileName,
    downloadedFilePath,
    mimeType
  );
  await updateMessage(
    emailError
      ? messages.errorInSendingMail(emailError)
      : await messages.emailedToDevice(user),
    state,
    true
  );
}

// If we are running a worker thread, then invoke
// handler with workerData
if (workerData) {
  documentHandler(workerData.user, workerData.document);
}
