import type { User } from "@prisma/client";
import { markdownv2 as format } from "telegram-format";
import { defaultCommands } from "./commands.js";
import domain from "./domain.js";
import { getUsageInfo } from "./user.js";

export const messages = {
  commands: {
    help: () => [
      `${format.escape(
        "đ Just send me the document or book (upload, forward, drag-n-drop), and I'll send it to your Kindle đ"
      )}\n\n${format.underline(
        "âšī¸ List of available commands:"
      )}\n\n${defaultCommands
        .map(({ command, description }) =>
          format.escape(`/${command} â ${description}`)
        )
        .join("\n")}`,
    ],
    usage: async (user: User) => {
      const { deliveriesToday, dailyDeliveryLimit, limitResetTime } =
        await getUsageInfo(user);
      const message = `${format.escape(`đ You have used`)} ${format.bold(
        format.escape(`${deliveriesToday} / ${dailyDeliveryLimit}`)
      )} ${format.escape(
        "deliveries for today. The limit will reset"
      )} ${format.bold(format.escape(limitResetTime))}${format.escape(
        ".\n\nBy donating a small amount, you can"
      )} ${format.bold(
        format.escape("increase your daily delivery limit by 10")
      )} ${format.escape("and support development of this bot :).")}\n
${format.bold(format.escape("đ¸ /donate"))}`;
      return [message];
    },
    donate: () => [
      format.escape(
        `đ¸ Thanks for considering a donation! You can increase your daily delivery limit by 10 and support the development of this bot :).\n
Choose an amount (in USD or INR) from below âŦī¸`
      ),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "đ $2.50", callback_data: "donate_2.5_USD" },
              { text: "đ âš150", callback_data: "donate_150_INR" },
            ],
            [
              { text: "đ $5", callback_data: "donate_5_USD" },
              { text: "đ âš350", callback_data: "donate_350_INR" },
            ],
            [
              { text: "đ¤Š $10", callback_data: "donate_10_USD" },
              { text: "đ¤Š âš750", callback_data: "donate_750_INR" },
            ],
          ],
        },
      },
    ],
    cancel: () => [
      format.escape("đ Ongoing command cancelled! Back to square one ;)"),
    ],
    edit_email: () => [
      `${format.escape("đ¨ Send me")} ${format.bold(
        format.escape("your Send-To-Kindle email")
      )}${format.escape(". It's the one that ends with")} ${format.monospace(
        "kindle.com"
      )}${format.escape(". /cancel to cancel this action!")}`,
    ],
  },
  newUser: (user: User) =>
    `${format.bold(format.escape(`â¨ New user joined!`))}
${format.escape(`Name: ${user.firstName} ${user.lastName || ""}
Username: ${user.username || "unknown"}
Chat ID: ${user.chatId}`)}`,
  invalidDefaultCommand: (isCommand: boolean) => {
    const message = isCommand
      ? "â ī¸ Unrecognized command! See /help"
      : "đ Please send a MOBI, EPUB or PDF file.";
    return [format.escape(message)];
  },
  onlyPrivateChats: `${format.escape(
    `â ī¸ I only work on private chats for now, DM me to get started!`
  )}\n${format.bold(format.escape("@kindle_joy_bot"))}`,
  initialization: (email: string): [string, any] => [
    `${format.escape(
      `đ Hi, BookBroker bot is at your service! But first, let's set you up!\n
Add the following email to your "Approved Personal Document E-mail List". Check out `
    )}${format.url(
      format.escape("Amazon's help page"),
      "https://www.amazon.com/gp/help/customer/display.html?nodeId=GX9XLEVV8G4DB28H"
    )} ${format.escape(
      "for instructions on how to.\n\nđ§: "
    )} ${format.monospace(email)}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: format.escape("â I've approved this email"),
              callback_data: "email_approved",
            },
          ],
        ],
      },
    },
  ],
  senderEmailYetToApprove: (email: string): [string, any] => [
    `${format.escape(
      `đ¤ Seems like you still haven't approved the email under "Approved Personal Document E-mail List". Check out `
    )}${format.url(
      format.escape("Amazon's help page"),
      "https://www.amazon.com/gp/help/customer/display.html?nodeId=GX9XLEVV8G4DB28H"
    )} ${format.escape(
      "for instructions on how to.\n\nđ§: "
    )} ${format.monospace(email)}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: format.escape("â I've approved this email"),
              callback_data: "email_approved",
            },
          ],
        ],
      },
    },
  ],
  requestKindleEmail: `${format.escape("đ¨ Now send me")} ${format.bold(
    format.escape("your Send-To-Kindle email")
  )}${format.escape(". It's the one that ends with")} ${format.monospace(
    "kindle.com"
  )}`,
  invalidKindleEmail: `${format.escape(
    "đ This seems to be an invalid Send-To-Kindle email ID. Make sure it ends with"
  )} ${format.monospace("kindle.com")}`,
  onlyFilesAccepted: format.escape("đ Please send a MOBI, EPUB or PDF file."),
  botReady: `${format.escape(
    `â Perfecto, we're all set! Just send me the document (upload, forward, drag-n-drop), and I'll send it to your Kindle đ\n`
  )}
${format.bold(
  format.escape("Your daily delivery limit is 5 books.")
)} ${format.escape(
    `You can /donate to increase it by 10 and support the development of this bot :)\n
Psst. If I ever misbehave, please contact @plibither8 :)`
  )}
  `,
  deliveryLimitReached: async (user: User) => {
    const { dailyDeliveryLimit, limitResetTime } = await getUsageInfo(user);
    return `${format.bold(
      format.escape(
        `â ī¸ Daily delivery limit of ${dailyDeliveryLimit} reached! Limit will reset ${limitResetTime}`
      )
    )}\n
${format.escape(
  `To increase your daily delivery limit by 10 deliveries (${
    dailyDeliveryLimit + 10
  }), and support development of this bot, you can donate a small amount :).`
)}\n
${format.bold(format.escape("đ¸ /donate"))}`;
  },
  donateLink: (
    amount: number,
    currency: string,
    link: string
  ) => `${format.escape(
    `đ Thanks for donating ${currency} ${amount}! You can complete the payment here:`
  )}\n
${format.bold(format.escape(link))}`,
  donationReceived: (
    amount: number,
    currency: string,
    limit: number
  ) => `${format.escape(
    `đ I received your payment of ${currency} ${amount}. Thanks a lot for supporting this bot! :)`
  )}\n
${format.bold(format.escape(`Your new daily delivery limit is ${limit}.`))}`,
  documentReceived: (fileName: string) =>
    `${format.bold(format.escape(fileName))}\n\n${format.escape(
      "đ Document received!"
    )}`,
  gettingFileInformation: format.escape("âšī¸ Getting file information..."),
  fileInformationReceived: format.escape("âšī¸ Received file information"),
  downloadingDocument: format.escape("đ Downloading document..."),
  documentDownloaded: format.escape("đ Document downloaded locally"),
  emailingToDevice: format.escape("đ§ Emailing the book to your device..."),
  emailedToDevice: async (user: User) => {
    const { deliveriesToday, dailyDeliveryLimit } = await getUsageInfo(user);
    return `${format.bold(format.escape("đ Emailed to your device, enjoy!"))}\n
${format.escape(
  `${deliveriesToday} / ${dailyDeliveryLimit} deliveries today. See /usage for more info.`
)}`;
  },
  errorInSendingMail: (err: string): string =>
    `${format.bold(
      format.escape("â Error in sending email!")
    )}\n${format.escape(err)}`,
  mobiConversionStarted: format.escape("đ Converting EPUB file to MOBI..."),
  mobiConversionDone: format.escape("â Book converted from EPUB to MOBI"),
  fileSizeLimit: format.escape(
    "â ī¸ File size limit is 20MB, please upload files under 20MB. Aborting..."
  ),
  reinitialisedBot: (): string =>
    format.escape(`âģī¸ Re-initialized bot with new domain: ${domain.domain}`),
  unauthorized: format.escape(
    "â You are unauthorized to interact with this bot."
  ),
  unauthorizedAlert: (
    id: number,
    firstName: string,
    isBot: boolean,
    text: string
  ): string =>
    format.escape(
      `đ¨ Unauthorized attempt!\nID: ${id}\nFirst name: ${firstName}\nBot? ${
        isBot ? "Yes" : "No"
      }\nText: ${text}`
    ),
};

export default messages;
