import axios from 'axios';

// Cache movie results to reduce API calls
const movieCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function fetchMovieInfo(title) {
    try {
        const response = await axios.get(`http://www.omdbapi.com/`, {
            params: {
                apikey: process.env.OMDB_API_KEY,
                t: title,
                plot: 'short'
            }
        });

        if (response.data.Response === 'False') {
            throw new Error(response.data.Error || 'Movie not found');
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching movie:', error.message);
        throw error;
    }
}

function formatMovieInfo(movie) {
    // Create basic info with fancy unicode characters
    const basicInfo = `📀 𝖳𝗂𝗍𝗅𝖾 : ${movie.Title}

🌟 𝖱𝖺𝗍𝗂𝗇𝗀 : ${movie.imdbRating || 'N/A'}/10
🗳️ 𝖵𝗈𝗍𝖾𝗌 : ${movie.imdbVotes || 'N/A'}
📆 𝖱𝖾𝗅𝖾𝖺𝗌𝖾 : ${movie.Released || 'N/A'}
🎭 𝖦𝖾𝗇𝗋𝖾 : ${movie.Genre || 'N/A'}
🔊 𝖫𝖺𝗇𝗀𝗎𝖺𝗀𝖾 : ${movie.Language || 'N/A'}
🌐 𝖢𝗈𝗎𝗇𝗍𝗋𝗒 : ${movie.Country || 'N/A'}
🎥 𝖣𝗂𝗋𝖾𝖼𝗍𝗈𝗋𝗌 : ${movie.Director || 'N/A'}
📝 𝖶𝗋𝗂𝗍𝖾𝗋𝗌 : ${movie.Writer || 'N/A'}
🔆 𝖲𝗍𝖺𝗋𝗌 : ${movie.Actors || 'N/A'}`;

    // If there's no plot, return just the basic info
    if (!movie.Plot) {
        return `${basicInfo}\n\n🗒 𝖲𝗍𝗈𝗋𝗒𝗅𝗂𝗇𝖾 : No plot available`;
    }

    // Get the short plot from the API
    const shortPlot = movie.Plot.split('.')[0] + '.';

    return `${basicInfo}\n\n🗒 𝖲𝗍𝗈𝗋𝗒𝗅𝗂𝗇𝖾 : ${shortPlot}`;
}

async function sendMovieInfo(bot, chatId, movieInfo) {
    try {
        const formattedInfo = formatMovieInfo(movieInfo);

        if (movieInfo.Poster && movieInfo.Poster !== 'N/A') {
            await bot.sendPhoto(chatId, movieInfo.Poster, {
                caption: formattedInfo,
                parse_mode: 'Markdown'
            });
        } else {
            await bot.sendMessage(chatId, formattedInfo, {
                parse_mode: 'Markdown'
            });
        }
    } catch (error) {
        console.error('Error sending movie info:', error);
        await bot.sendMessage(
            chatId,
            '❌ Error displaying movie information. Please try again.'
        );
    }
}

export function setupMovieCommand(bot) {
    // Handle /movie or /mv command
    bot.onText(/\/(movie|mv)(?:\s+(.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const movieTitle = match[2]?.trim();

        if (!movieTitle) {
            await bot.sendMessage(
                chatId,
                `*Movie Information Search* 🎬\n\n` +
                `Search for movie details using:\n` +
                `• /movie <title>\n` +
                `• /mv <title>\n\n` +
                `Examples:\n` +
                `\`/movie The Matrix\`\n` +
                `\`/mv Inception\``,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Check cache first
        const cacheKey = movieTitle.toLowerCase();
        const cachedResult = movieCache.get(cacheKey);
        
        if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_DURATION) {
            await sendMovieInfo(bot, chatId, cachedResult.data);
            return;
        }

        // Show loading message
        const loadingMsg = await bot.sendMessage(
            chatId, 
            '🔍 Searching for movie...',
            { parse_mode: 'Markdown' }
        );

        try {
            const movieInfo = await fetchMovieInfo(movieTitle);
            
            // Cache the result
            movieCache.set(cacheKey, {
                data: movieInfo,
                timestamp: Date.now()
            });

            // Delete loading message
            await bot.deleteMessage(chatId, loadingMsg.message_id);
            
            // Send movie info
            await sendMovieInfo(bot, chatId, movieInfo);

        } catch (error) {
            await bot.editMessageText(
                `❌ ${error.message || 'Failed to fetch movie information. Please try again.'}`,
                {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id
                }
            );
        }
    });
} 