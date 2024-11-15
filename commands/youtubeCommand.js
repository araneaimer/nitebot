import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

const isValidYoutubeUrl = (url) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
};

export function setupYoutubeCommand(bot) {
    const downloadingUsers = new Set();

    bot.onText(/\/(ytdl|yt) (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const url = match[2].trim();

        if (downloadingUsers.has(userId)) {
            await bot.sendMessage(chatId, '⚠️ Please wait for your current download to complete.');
            return;
        }

        if (!isValidYoutubeUrl(url)) {
            await bot.sendMessage(chatId, '❌ Please provide a valid YouTube URL.');
            return;
        }

        try {
            downloadingUsers.add(userId);
            const statusMessage = await bot.sendMessage(chatId, '🔍 Fetching video information...');
            
            // Get video info using yt-dlp
            const { stdout: info } = await execAsync(`yt-dlp --dump-json "${url}"`);
            const videoInfo = JSON.parse(info);
            const videoTitle = videoInfo.title;
            const tempPath = join(tmpdir(), `${Date.now()}-${userId}.mp4`);

            await bot.editMessageText(
                `📥 Downloading: ${videoTitle}\n\n` +
                'Quality: Best available (up to 1080p)\n' +
                'Please wait...',
                {
                    chat_id: chatId,
                    message_id: statusMessage.message_id
                }
            );

            // Download using yt-dlp with best quality (up to 1080p)
            const downloadCmd = [
                'start /B',
                'yt-dlp',
                '-f "bv*[height<=1080][ext=mp4]+ba[ext=m4a]"',
                '--merge-output-format mp4',
                `--output "${tempPath}"`,
                '--no-warnings',
                '--no-playlist',
                '--quiet',
                `"${url}"`
            ].join(' ');

            await execAsync(downloadCmd);

            await bot.editMessageText(
                '📤 Uploading to Telegram...',
                {
                    chat_id: chatId,
                    message_id: statusMessage.message_id
                }
            );

            await bot.sendDocument(chatId, tempPath, {
                caption: `🎥 ${videoTitle}`,
                reply_to_message_id: msg.message_id
            });

            await unlink(tempPath);
            await bot.deleteMessage(chatId, statusMessage.message_id);

        } catch (error) {
            console.error('YouTube download error:', error);
            let errorMessage = '❌ Failed to download video. Please try again.';
            
            if (error.message.includes('too large')) {
                errorMessage = '❌ Video is too large (>2GB). Please try a different video.';
            } else if (error.message.includes('Private video')) {
                errorMessage = '❌ This video is private.';
            } else if (error.message.includes('not available')) {
                errorMessage = '❌ This video is not available.';
            }
            
            await bot.sendMessage(chatId, errorMessage);
        } finally {
            downloadingUsers.delete(userId);
        }
    });

    // Help command
    bot.onText(/\/(yt|ytdl)$/, async (msg) => {
        const helpText = `
🎥 *YouTube Downloader*

Download YouTube videos in high quality!

*Usage:*
• /yt [YouTube URL]
• /ytdl [YouTube URL]

*Examples:*
• /yt https://youtube.com/watch?v=...
• /ytdl https://youtu.be/...

*Features:*
• Downloads in best available quality (up to 1080p)
• Supports videos up to 2GB
• Supports both youtube.com and youtu.be links

*Note:* Please wait for each download to complete before starting another.
`;
        await bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
    });
} 