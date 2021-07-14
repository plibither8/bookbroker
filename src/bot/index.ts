import api from "./api";
import messages from "./messages";
import {
  createWebhookUrl,
  isBotInitialised,
  isAuthorized,
  isDocument,
} from "./utils";
import handler from "./handler";

async function initialiseBot(forceReinit = false) {
  const initisationStatus = await isBotInitialised();
  if (initisationStatus && !forceReinit) return;

  console.log("Initialising bot...");
  await Promise.all([
    api.setWebhook({ url: createWebhookUrl() }),
    api.sendMessage(messages.reinitialisedBot(), undefined, {
      disable_web_page_preview: true,
    }),
  ]);
  console.log("Bot initialised!");
}

initialiseBot();

export default async function webhookHandler(req, res): Promise<void> {
  const { message } = req.body;
  if (message) {
    const { from, text, document } = message;
    if ((await isAuthorized(from, text)) && (await isDocument(document))) {
      handler(document);
    }
  }
  res.end();
}
