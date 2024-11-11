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

const getMemeFromReddit = async (subreddit = null) => {
    try {
        // Use provided subreddit or get a random one from our curated list
        const targetSubreddit = subreddit || MEME_SUBREDDITS[Math.floor(Math.random() * MEME_SUBREDDITS.length)];
        
        const response = await axios.get(
            `https://www.reddit.com/r/${targetSubreddit}/hot.json?limit=50`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        // Verify if the subreddit exists and has posts
        if (!response.data.data.children.length) {
            throw new Error('Subreddit not found or has no posts');
        }

        // Get all valid image posts
        const posts = response.data.data.children.filter(post => {
            const isValidImage = post.data.url?.match(/\.(jpg|jpeg|png|gif)$/i);
            return isValidImage && !post.data.is_video && !post.data.stickied;
        });

        if (posts.length === 0) {
            throw new Error('No valid memes found');
        }

        // Get a random post from filtered posts
        const randomPost = posts[Math.floor(Math.random() * posts.length)].data;
        
        return {
            title: randomPost.title,
            url: randomPost.url,
            author: randomPost.author,
            subreddit: randomPost.subreddit,
            upvotes: randomPost.ups,
            link: `https://reddit.com${randomPost.permalink}`
        };
    } catch (error) {
        console.error('Error in getMemeFromReddit');
        throw error;
    }
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
                
                const caption = `${meme.title}\n\n` +
                              `👤 u/${meme.author}\n` +
                              `👍 ${meme.upvotes.toLocaleString()} upvotes\n` +
                              `🔗 r/${meme.subreddit}`;

                await bot.sendPhoto(chatId, meme.url, {
                    caption: caption
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
};

export { setupMemeCommand };