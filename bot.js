import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Initialize bot http token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

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
