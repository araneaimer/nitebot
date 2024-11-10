import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Initialize bot http token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Define help message constant at the top level
const HELP_MESSAGE = `Hi, My name is Nite
I am a versatile personal assistant bot currently under development.`;

const HELP_KEYBOARD = {
    inline_keyboard: [
        [
            { text: 'Commands', callback_data: 'help_commands' },
            { text: 'About', callback_data: 'help_about' }
        ]
    ]
};

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;
    
    // Get current hour in user's timezone
    const hour = new Date().getHours();
    
    // Determine greeting based on time of day
    let greeting;
    if (hour >= 5 && hour < 12) {
        greeting = `Good Morning ${firstName}! 🌅`;
    } else if (hour >= 12 && hour < 17) {
        greeting = `Good Afternoon ${firstName}! ☀️`;
    } else if (hour >= 17 && hour < 22) {
        greeting = `Good Evening ${firstName}! 🌆`;
    } else {
        greeting = `Good Night ${firstName}! 🌙`;
    }

    bot.sendMessage(chatId, greeting);
});

// Handle /help or /? command
bot.onText(/\/(help|\?)/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, HELP_MESSAGE, {
        parse_mode: 'Markdown',
        reply_markup: HELP_KEYBOARD
    });
});

// Handle callback queries from inline keyboard
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    switch (query.data) {
        case 'help_commands':
            const commandsList = `*Available Commands:*

/time, /tm, /t (timezone) - Display real-time chronological data
/imagine, /image, /im, /i (prompt) - Generate images using AI
/currency, /cr (currency conversion) - Real-time currency conversions
/remind, /rm - Set message reminders`;

            bot.editMessageText(commandsList, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '<< Back', callback_data: 'help_main' }
                    ]]
                }
            });
            break;

        case 'help_about':
            const aboutText = `*About Nite Bot*
A versatile Telegram bot.
Version: 1.0
Developer: @lordaimer`;

            bot.editMessageText(aboutText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '<< Back', callback_data: 'help_main' }
                    ]]
                }
            });
            break;

        case 'help_main':
            bot.editMessageText(HELP_MESSAGE, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: HELP_KEYBOARD
            });
            break;
    }
});
