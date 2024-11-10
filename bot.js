import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { setupTimeCommand } from './commands/timeCommand.js';
import { setupHelpCommand } from './commands/helpCommand.js';
import { setupStartCommand } from './commands/startCommand.js';

// Initialize environment variables
dotenv.config();

// Initialize bot with token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Setup all commands
setupTimeCommand(bot);
setupHelpCommand(bot);
setupStartCommand(bot);
