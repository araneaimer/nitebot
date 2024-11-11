import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import URLParse from 'url-parse';
import { setupTimeCommand } from './commands/timeCommand.js';
import { setupHelpCommand } from './commands/helpCommand.js';
import { setupStartCommand } from './commands/startCommand.js';
import { setupCurrencyCommand } from './commands/currencyCommand.js';
import { setupMemeCommand } from './commands/memeCommand.js';
import { setupJokeCommand } from './commands/jokeCommand.js';
import { setupFactCommand } from './commands/factCommand.js';
import { setupImageCommand } from './commands/imagineCommand.js';

// Initialize environment variables
dotenv.config();

// Configure bot with modern URL parsing
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: true,
    request: {
        parseUrl: URLParse
    }
});

// Setup all commands
setupTimeCommand(bot);
setupHelpCommand(bot);
setupStartCommand(bot);
setupCurrencyCommand(bot);
setupMemeCommand(bot);
setupJokeCommand(bot);
setupFactCommand(bot);
setupImageCommand(bot);
