export default {
  domain: "https://example.com",
  useWorkerThreads: false,
  bot: {
    webhookPath: "/~telegram",
    token: process.env.TG_BOT_API_TOKEN,
    chatId: "telegram_chat_id",
  },
};
