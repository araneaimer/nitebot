import axios from 'axios';

// Cache movie results to reduce API calls
const movieCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function fetchMovieInfo(query, isImdbId = false) {
    try {
        const response = await axios.get(`http://www.omdbapi.com/`, {
            params: {
                apikey: process.env.OMDB_API_KEY,
                [isImdbId ? 'i' : 't']: query,
                plot: 'short'
            }
        });

        if (response.data.Response === 'False') {
            throw new Error(response.data.Error || 'Movie not found');
        }

        // If movie has a poster, get high resolution version
        if (response.data.Poster && response.data.Poster !== 'N/A') {
            // The default OMDB poster URLs are in this format:
            // https://m.media-amazon.com/images/M/[image_id].jpg
            // We can modify it to get higher resolution by changing the end part
            response.data.Poster = response.data.Poster
                .replace('_SX300', '_SX1500')  // Increase width to 1500
                .replace('_SY300', '_SY2000'); // Increase height to 2000
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
📆 𝖱𝖾𝗅𝖾𝖺𝗌𝖾 : ${movie.Released || 'N/A'}
🎭 𝖦𝖾𝗇𝗋𝖾 : ${movie.Genre || 'N/A'}
🔊 𝖫𝖺𝗇𝗀𝗎𝖺𝗀𝖾 : ${movie.Language || 'N/A'}
🎥 𝖣𝗂𝗋𝖾𝖼𝗍𝗈𝗋𝗌 : ${movie.Director || 'N/A'}
🔆 𝖲𝗍𝖺𝗋𝗌 : ${movie.Actors || 'N/A'}

🗒 𝖲𝗍𝗈𝗋𝗒𝗅𝗂𝗇𝖾 : ${movie.Plot || 'No plot available'}`;

    return basicInfo;
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
        
        // If caption is too long, try sending with shorter plot
        if (error.message.includes('caption is too long')) {
            const shortPlot = movieInfo.Plot.split('.')[0] + '.';
            movieInfo.Plot = shortPlot;
            
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
        } else {
            await bot.sendMessage(
                chatId,
                '❌ Error displaying movie information. Please try again.'
            );
        }
    }
}

export function setupMovieCommand(bot) {
    // Handle /movie or /mv command with either title or IMDb ID
    bot.onText(/\/(movie|mv)(?:\s+(.+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const searchQuery = match[2]?.trim();

        if (!searchQuery) {
            await bot.sendMessage(
                chatId,
                `*Movie Information Search* 🎬\n\n` +
                `Search by title or IMDb ID:\n` +
                `• /movie <title>\n` +
                `• /mv <imdb_id>\n\n` +
                `Examples:\n` +
                `\`/movie The Matrix\`\n` +
                `\`/mv tt0133093\`\n` +
                `\`/movie tt16366836\``,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Show loading message
        const loadingMsg = await bot.sendMessage(
            chatId, 
            '🔍 Searching for movie...',
            { parse_mode: 'Markdown' }
        );

        try {
            // Check if the input is an IMDb ID (starts with 'tt' followed by numbers)
            const isImdbId = /^tt\d+$/.test(searchQuery);
            
            const movieInfo = await fetchMovieInfo(searchQuery, isImdbId);
            
            // Cache the result
            movieCache.set(searchQuery.toLowerCase(), {
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