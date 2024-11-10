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

const getMemeFromReddit = async () => {
    try {
        // Get a random subreddit from our list
        const randomSubreddit = MEME_SUBREDDITS[Math.floor(Math.random() * MEME_SUBREDDITS.length)];
        
        const response = await axios.get(
            `https://www.reddit.com/r/${randomSubreddit}/hot.json?limit=50`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

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
        console.error('Error in getMemeFromReddit:', error);
        throw error;
    }
};

const setupMemeCommand = (bot) => {
    bot.onText(/\/(meme|mm)/, async (msg) => {
        const chatId = msg.chat.id;
        
        try {
            // Send "typing" action
            await bot.sendChatAction(chatId, 'upload_photo');
            
            const meme = await getMemeFromReddit();
            
            const caption = `${meme.title}\n\n` +
                          `👤 u/${meme.author}\n` +
                          `👍 ${meme.upvotes.toLocaleString()} upvotes\n` +
                          `🔗 r/${meme.subreddit}`;

            await bot.sendPhoto(chatId, meme.url, {
                caption: caption
            });

        } catch (error) {
            console.error('Meme command error:', error);
            await bot.sendMessage(
                chatId, 
                '😕 Sorry, I couldn\'t fetch a meme right now. Please try again later.'
            );
        }
    });
};

export { setupMemeCommand };