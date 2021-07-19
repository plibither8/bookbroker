export interface BotCommand {
  command: string;
  description: string;
}

export const commandAliases: { [key: string]: string } = {
  limits: "usage",
  status: "usage",
  buy: "donate",
  info: "help",
};

export const defaultCommands: BotCommand[] = [
  {
    command: "help",
    description: "ℹ️ Show list of commands and help information",
  },
  {
    command: "usage",
    description:
      "📊 Show your current usage status, per your daily delivery limit",
  },
  {
    command: "donate",
    description:
      "💸 Donate a small amount to increase your delivery limit and support me",
  },
  {
    command: "cancel",
    description: "❎ Cancel the ongoing command",
  },
];

export const commands: BotCommand[] = [
  ...defaultCommands,
  ...Object.entries(commandAliases).map(([alias, target]) => ({
    command: alias,
    description: defaultCommands.find(({ command }) => target === command)
      .description,
  })),
];
