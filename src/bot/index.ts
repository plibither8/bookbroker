import api from "./api";
import { defaultCommands } from "./commands";
import messages from "./messages";
import { createWebhookUrl, isBotInitialised } from "./utils";
import { getOrCreateUser } from "./user";
import { callbackAction } from "./callback";
import { State, stateHandlers } from "./states";

async function initialiseBot(forceReinit = false) {
  const initisationStatus = await isBotInitialised();
  if (initisationStatus && !forceReinit) return;

  console.log("Initialising bot...");
  await Promise.all([
    api.setWebhook({ url: createWebhookUrl() }),
    api.setCommands({ commands: defaultCommands }),
    api.sendMessage(messages.reinitialisedBot(), undefined, {
      disable_web_page_preview: true,
    }),
  ]);
  console.log("Bot initialised!");
}

initialiseBot(false);

export default async function webhookHandler(req, res): Promise<void> {
  const { message, callback_query } = req.body;

  if (callback_query) {
    callbackAction(callback_query);
    return res.end();
  }

  if (message) {
    if (message.chat.type !== "private") {
      await api.sendMessage(messages.onlyPrivateChats, message.chat.id);
      return res.end();
    }
    const user = await getOrCreateUser(message.from);
    await stateHandlers[user.state as State](user, message);
  }

  res.end();
}
