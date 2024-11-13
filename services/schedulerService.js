import moment from 'moment-timezone';
import { getSubscriptions } from '../commands/subscribeCommand.js';
import { storageService } from './storageService.js';
import { getFact } from '../commands/factCommand.js';
import { fetchJoke } from '../commands/jokeCommand.js';
import { getMemeFromReddit } from '../commands/memeCommand.js';

// Import the content fetching functions
async function fetchContent(type) {
    try {
        switch (type) {
            case 'fact':
                const { fact } = await getFact('random');
                return fact;
            case 'joke':
                return await fetchJoke();
            case 'meme':
                const meme = await getMemeFromReddit();
                return { type: 'meme', ...meme };
            default:
                throw new Error('Invalid content type');
        }
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        return null;
    }
}

export function setupScheduler(bot) {
    console.log('Setting up scheduler...');
    
    // Check subscriptions every minute
    setInterval(async () => {
        const now = moment();
        const currentTime = now.format('HH:mm');
        console.log(`Checking subscriptions at ${currentTime}`);

        const currentSubscriptions = getSubscriptions();
        console.log('Active subscriptions:', [...currentSubscriptions.entries()]);

        for (const [chatId, userSubs] of currentSubscriptions.entries()) {
            for (const [contentType, subData] of Object.entries(userSubs)) {
                const { times, timezone = 'UTC' } = subData;
                const userTime = moment().tz(timezone).format('HH:mm');
                
                if (times.includes(userTime)) {
                    console.log(`Sending ${contentType} to ${chatId} at ${userTime}`);
                    try {
                        await bot.sendChatAction(chatId, 'typing');
                        const content = await fetchContent(contentType);
                        
                        if (!content) {
                            console.log(`No content fetched for ${contentType}`);
                            continue;
                        }

                        if (typeof content === 'object' && content.type === 'meme') {
                            await bot.sendPhoto(chatId, content.url, {
                                caption: content.title,
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: '🔄 Another Meme', callback_data: 'meme_another' },
                                        { text: '❌ Stop Daily Memes', callback_data: 'unsub_meme' }
                                    ]]
                                }
                            });
                        } else {
                            await bot.sendMessage(chatId, content, {
                                parse_mode: 'Markdown',
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: `🔄 Another ${contentType}`, callback_data: `${contentType}_another` },
                                        { text: `❌ Stop Daily ${contentType}s`, callback_data: `unsub_${contentType}` }
                                    ]]
                                }
                            });
                        }
                        console.log(`Successfully sent ${contentType} to ${chatId}`);
                    } catch (error) {
                        console.error(`Error sending ${contentType} to ${chatId}:`, error);
                        if (error.code === 'ETELEGRAM' && error.response?.statusCode === 403) {
                            console.log(`Removing inaccessible chat ${chatId} from subscriptions`);
                            storageService.removeSubscription(chatId);
                        }
                    }
                }
            }
        }
    }, 60000); // Check every minute

    // Handle "Another" button callbacks
    bot.on('callback_query', async (query) => {
        if (query.data.endsWith('_another')) {
            const contentType = query.data.split('_')[0];
            const chatId = query.message.chat.id;

            try {
                await bot.answerCallbackQuery(query.id);
                await bot.sendChatAction(chatId, 'typing');

                const content = await fetchContent(contentType);
                if (!content) return;

                // Delete the original message
                await bot.deleteMessage(chatId, query.message.message_id);

                // Send new content
                if (typeof content === 'object' && content.type === 'meme') {
                    await bot.sendPhoto(chatId, content.url, {
                        caption: content.title,
                        reply_markup: query.message.reply_markup
                    });
                } else {
                    await bot.sendMessage(chatId, content, {
                        parse_mode: 'Markdown',
                        reply_markup: query.message.reply_markup
                    });
                }
            } catch (error) {
                console.error(`Error handling ${contentType} refresh:`, error);
                await bot.answerCallbackQuery(query.id, {
                    text: 'Sorry, something went wrong. Please try again.',
                    show_alert: true
                });
            }
        }
    });
}