# bookbroker

> 🤖📚 Telegram bot to convert and email PDFs, EPUBs or MOBIs to your Kindle

[**@bookbrokerbot**: Start a chat with the bot!](https://t.me/bookbrokerbot)

<p align="center">
  <img src="assets/demo.gif" height="500"/>
</p>

## Self-host

### Create a Telegram Bot

You would first need to create a Telegram bot and get the bot's access token. Fortunately, it's pretty simple and easy: you can create one with [@BotFather](https://t.me/BotFather).

Make sure to take note of the token received! It should look like this: `3141592653:KAS_JFD04YEGFxbQV4FTPetQpZefUhr37HC`.

### Get your Telegram Chat ID

The `chat_id` identifies you on Telegram. You can get it by `/start`ing a chat with [@RawDataBot](https://t.me/RawDataBot) or [some other ways](https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id). It can be a positive or negative number.

### Setup the Server

1. Clone this repo: `git clone https://github.com/plibither8/bookbroker`
2. Install dependencies: `pnpm install`
3. Create `config.ts` and `.env` files from their examples: `cp config.example.ts config.ts`, `cp .env.example .env`
4. Edit the `config.ts` and `.env` file with **your values**

#### Development

Install ngrok: [ngrok.com](https://ngrok.com).

The project uses ngrok, nodemon and ts-node for local development. Do make sure to have `ENVIRONMENT="dev"` in your local .env file.

The domain used in development is provided by [ngrok](https://ngrok.com), thus the local config can leave the `domain` key empty.

```sh
$ pnpm dev
```

#### Production

The project uses `tsc` to build the files. On production, the webhook domain is determined by the the `domain` key in the config.ts file.

```sh
$ pnpm build
$ pnpm run
```

## License

[MIT](LICENSE)
