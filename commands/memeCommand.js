import axios from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read subreddits from JSON file
let MEME_SUBREDDITS;
try {
    const jsonData = readFileSync(join(__dirname, '../data/memeSubreddits.json'), 'utf8');
    MEME_SUBREDDITS = JSON.parse(jsonData).subreddits;
    // console.log('Loaded subreddits:', MEME_SUBREDDITS.length);
} catch (error) {
    console.error('Error loading memeSubreddits.json:', error);
    // Fallback array in case the file can't be read
    MEME_SUBREDDITS = ['memes', 'dankmemes', 'wholesomememes'];
}

// Add this after other constants
const userPreferences = new Map();

// Add these constants at the top with other constants
const YVAINE_CHAT_ID = process.env.YVAINE_CHAT_ID;
const ARANE_CHAT_ID = process.env.ARANE_CHAT_ID;

const getMemeFromReddit = async (subreddit = null) => {
    try {
        const targetSubreddit = subreddit || MEME_SUBREDDITS[Math.floor(Math.random() * MEME_SUBREDDITS.length)];
        
        // Randomly choose a sorting method and time filter
        const sortMethods = ['hot', 'top', 'new'];
        const timeFilters = ['all', 'year', 'month', 'week'];
        const randomSort = sortMethods[Math.floor(Math.random() * sortMethods.length)];
        const randomTime = timeFilters[Math.floor(Math.random() * timeFilters.length)];

        // Construct the URL with proper sorting and time parameters
        let url = `https://www.reddit.com/r/${targetSubreddit}/${randomSort}.json`;
        if (randomSort === 'top') {
            url += `?t=${randomTime}`;
        }

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36'
            },
            params: {
                limit: 100
            }
        });

        if (!response.data.data.children.length) {
            throw new Error('Subreddit not found or has no posts');
        }

        const posts = response.data.data.children.filter(post => {
            const isValidImage = post.data.url?.match(/\.(jpg|jpeg|png|gif)$/i);
            return isValidImage && !post.data.is_video && !post.data.stickied;
        });

        if (posts.length === 0) {
            throw new Error('No valid memes found');
        }

        const randomPost = posts[Math.floor(Math.random() * posts.length)].data;
        
        return {
            title: randomPost.title,
            url: randomPost.url,
            author: randomPost.author,
            subreddit: randomPost.subreddit,
            upvotes: randomPost.ups,
            link: `https://reddit.com${randomPost.permalink}`,
            sortMethod: randomSort,
            timeFilter: randomSort === 'top' ? randomTime : null
        };
    } catch (error) {
        throw error;
    }
};

const getCustomInlineKeyboard = (chatId, preferredSubreddit, meme) => {
    const buttons = [{
        text: preferredSubreddit 
            ? `🎲 Another meme from r/${preferredSubreddit}`
            : '🎲 Another random meme',
        callback_data: `meme_${preferredSubreddit || 'random'}`
    }];

    // Add forward button only for Arane and Yvaine
    if (chatId === YVAINE_CHAT_ID) {
        buttons.push({
            text: "Send to Arane ❤️",
            callback_data: `send_meme_${ARANE_CHAT_ID}_${meme.url}`
        });
    } else if (chatId === ARANE_CHAT_ID) {
        buttons.push({
            text: "Send to Yvaine ❤️",
            callback_data: `send_meme_${YVAINE_CHAT_ID}_${meme.url}`
        });
    }

    return {
        inline_keyboard: [buttons]
    };
};

const setupMemeCommand = (bot) => {
    bot.onText(/\/(meme|mm)(?:\s+(\w+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const requestedSubreddit = match[2]?.toLowerCase();
        
        try {
            // Validate and update subreddit preference if specified
            if (requestedSubreddit) {
                if (requestedSubreddit === 'random') {
                    userPreferences.delete(chatId);
                    await bot.sendMessage(chatId, '🎲 Set to random subreddits mode!');
                } else {
                    // No validation against MEME_SUBREDDITS - allow any subreddit
                    userPreferences.set(chatId, requestedSubreddit);
                    await bot.sendMessage(chatId, `✅ Set default subreddit to r/${requestedSubreddit}`);
                }
            }

            await bot.sendChatAction(chatId, 'upload_photo');
            
            const actionInterval = setInterval(() => {
                bot.sendChatAction(chatId, 'upload_photo').catch(() => {});
            }, 3000);
            
            try {
                // Use user's preferred subreddit if it exists
                const preferredSubreddit = userPreferences.get(chatId);
                const meme = await getMemeFromReddit(preferredSubreddit);
                
                // Calculate padding to align the second column
                const firstColumnWidth = Math.max(
                    `👤 u/${meme.author}`.length,
                    `🔗 r/${meme.subreddit}`.length
                ) + 4; // Add some extra spacing

                // Create padded strings
                const authorLine = `👤 u/${meme.author}`.padEnd(firstColumnWidth);
                const subredditLine = `🔗 r/${meme.subreddit}`.padEnd(firstColumnWidth);
                
                const caption = `${meme.title}\n\n` +
                              `💻 u/${meme.author}\n` +
                              `⌨️ r/${meme.subreddit}`;

                // Modified button text
                const buttonText = preferredSubreddit 
                    ? `🎲 Another meme from r/${preferredSubreddit}`
                    : '🎲 Another random meme';

                await bot.sendPhoto(chatId, meme.url, {
                    caption: caption,
                    reply_markup: getCustomInlineKeyboard(chatId, preferredSubreddit, meme)
                });
            } finally {
                clearInterval(actionInterval);
            }
            
        } catch (error) {
            let errorMessage = '😕 Sorry, I couldn\'t fetch a meme right now. Please try again later.';
            
            // Provide more specific error messages
            if (error.message === 'Subreddit not found or has no posts') {
                errorMessage = '❌ This subreddit doesn\'t exist or has no posts. Please try another one.';
            } else if (error.response?.status === 403) {
                errorMessage = '❌ This subreddit is private or quarantined.';
            } else if (error.response?.status === 404) {
                errorMessage = '❌ Subreddit not found.';
            }
            
            await bot.sendMessage(chatId, errorMessage);
        }
    });

    // Add callback query handler for the inline button
    bot.on('callback_query', async (query) => {
        if (query.data.startsWith('meme_')) {
            const chatId = query.message.chat.id;
            const subreddit = query.data.replace('meme_', '');
            
            try {
                await bot.answerCallbackQuery(query.id);
                await bot.sendChatAction(chatId, 'upload_photo');
                
                const actionInterval = setInterval(() => {
                    bot.sendChatAction(chatId, 'upload_photo').catch(() => {});
                }, 3000);
                
                try {
                    const meme = await getMemeFromReddit(subreddit === 'random' ? null : subreddit);
                    
                    // Calculate padding to align the second column
                    const firstColumnWidth = Math.max(
                        `👤 u/${meme.author}`.length,
                        `🔗 r/${meme.subreddit}`.length
                    ) + 4; // Add some extra spacing

                    // Create padded strings
                    const authorLine = `👤 u/${meme.author}`.padEnd(firstColumnWidth);
                    const subredditLine = `🔗 r/${meme.subreddit}`.padEnd(firstColumnWidth);
                    
                    const caption = `${meme.title}\n\n` +
                                  `${authorLine}👍 ${meme.upvotes.toLocaleString()}\n` +
                                  `${subredditLine}📊 From ${meme.sortMethod}${meme.timeFilter ? '/' + meme.timeFilter : ''}`;

                    // Modified button text
                    const buttonText = subreddit !== 'random'
                        ? `🔄 Another meme from r/${subreddit}`
                        : '🔄 Another random meme';

                    await bot.sendPhoto(chatId, meme.url, {
                        caption: caption,
                        reply_markup: getCustomInlineKeyboard(chatId, subreddit, meme)
                    });
                } finally {
                    clearInterval(actionInterval);
                }
            } catch (error) {
                let errorMessage = '😕 Sorry, I couldn\'t fetch a meme right now. Please try again later.';
                
                if (error.message === 'Subreddit not found or has no posts') {
                    errorMessage = '❌ This subreddit doesn\'t exist or has no posts. Please try another one.';
                } else if (error.response?.status === 403) {
                    errorMessage = '❌ This subreddit is private or quarantined.';
                } else if (error.response?.status === 404) {
                    errorMessage = '❌ Subreddit not found.';
                }
                
                await bot.answerCallbackQuery(query.id, {
                    text: errorMessage,
                    show_alert: true
                });
            }
        } else if (query.data.startsWith('send_meme_')) {
            try {
                const [, , targetChatId] = query.data.split('_');
                
                // Forward the message that contains the meme
                await bot.forwardMessage(
                    targetChatId,                // Target chat ID
                    query.message.chat.id,       // Source chat ID
                    query.message.message_id     // Message ID to forward
                );
                
                await bot.answerCallbackQuery(query.id, {
                    text: "Meme forwarded successfully! 💝",
                    show_alert: true
                });
            } catch (error) {
                console.error('Error forwarding meme:', error);
                await bot.answerCallbackQuery(query.id, {
                    text: "Failed to forward the meme 😕",
                    show_alert: true
                });
            }
        }
    });
};

export { setupMemeCommand };