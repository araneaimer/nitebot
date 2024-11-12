import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import URLParse from 'url-parse';
import { setupTimeCommand } from './commands/timeCommand.js';
import { setupHelpCommand } from './commands/helpCommand.js';
import { setupStartCommand } from './commands/startCommand.js';
import { setupCurrencyCommand } from './commands/currencyCommand.js';
import { setupMemeCommand, getMemeResponse, userPreferences } from './commands/memeCommand.js';
import { setupJokeCommand } from './commands/jokeCommand.js';
import { setupFactCommand } from './commands/factCommand.js';
import { setupImageCommand } from './commands/imagineCommand.js';
import { setupAdminCommands } from './commands/adminCommands.js';
import { llmService } from './services/llmService.js';

// Initialize environment variables
dotenv.config();

// Configure bot with modern URL parsing
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: true,
    request: {
        parseUrl: URLParse
    }
});

// Add message handler before command setup
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // Ignore messages that:
    // - Start with '/' (commands)
    // - Are empty or undefined
    // - Are from a bot
    // - Are forwarded messages
    if (!messageText || 
        messageText.startsWith('/') || 
        msg.from.is_bot || 
        msg.forward_date) {
        return;
    }

    try {
        // Check for meme intent with potential subreddit
        const intent = await llmService.detectIntent(messageText);
        
        if (intent.type === 'meme') {
            // Array of fun loading messages
            const loadingMessages = [
                "🚀 Launching meme delivery system...",
                "📦 Packaging your meme with extra laughs...",
                "🔍 Searching the memeverse...",
                "⚡ Summoning the perfect meme...",
                "🎯 Target acquired! Deploying meme...",
                "🌟 Channeling meme energy...",
                "🎭 Preparing your dose of humor...",
                "🎨 Crafting your meme experience...",
                "🎁 Wrapping up something special..."
            ];
            
            const loadingMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
            const statusMessage = await bot.sendMessage(chatId, loadingMessage);
            
            try {
                // Create a fake message object
                const fakeMsg = {
                    ...msg,
                    text: intent.isRandom ? '/meme random' : 
                          intent.subreddit ? `/meme ${intent.subreddit}` : '/meme'
                };

                const match = fakeMsg.text.match(/\/(meme|mm)(?:\s+(\w+))?/);

                if (match) {
                    if (intent.isRandom) {
                        await bot.sendMessage(chatId, '🎲 Setting meme mode to random');
                        userPreferences.delete(chatId);
                    } else if (intent.subreddit) {
                        await bot.sendMessage(chatId, `🎯 Setting default subreddit to r/${intent.subreddit}`);
                    }
                    
                    await getMemeResponse(bot, chatId, intent.isRandom ? 'random' : intent.subreddit);
                } else {
                    throw new Error('Invalid command format');
                }
                
                await bot.deleteMessage(chatId, statusMessage.message_id);
            } catch (error) {
                console.error('Error in meme command:', error);
                await bot.editMessageText('😅 Oops! The meme escaped. Let\'s try again!', {
                    chat_id: chatId,
                    message_id: statusMessage.message_id
                });
            }
            return;
        }

        // If no meme intent, proceed with regular LLM conversation
        await bot.sendChatAction(chatId, 'typing');
        const response = await llmService.generateResponse(messageText, chatId);
        await llmService.sendResponse(bot, chatId, response);
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

// Global callback query handler to route to appropriate handlers
bot.on('callback_query', async (query) => {
    // Route based on callback data prefix
    if (query.data.startsWith('help_')) {
        // Help command callbacks will be handled in setupHelpCommand
        return;
    } else if (query.data.startsWith('meme_') || query.data.startsWith('send_to_')) {
        // Meme command callbacks will be handled in setupMemeCommand
        return;
    } else if (query.data.startsWith('admin_') || query.data.startsWith('notify_')) {
        // Check admin status only for admin-related actions
        const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
        if (query.from.id.toString() !== ADMIN_USER_ID) {
            return bot.answerCallbackQuery(query.id, "⛔ This action is only available for administrators.");
        }
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

// Setup admin commands
setupAdminCommands(bot);

// Add this function to detect meme intents
function detectMemeIntent(text) {
    const memeKeywords = [
        'send me a meme',
        'show me a meme',
        'i want a meme',
        'give me a meme',
        'share a meme',
        'need a meme',
        'meme please',
        'another meme'
    ];
    
    const normalizedText = text.toLowerCase().trim();
    return memeKeywords.some(keyword => normalizedText.includes(keyword));
}
