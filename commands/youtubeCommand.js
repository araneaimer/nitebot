import { createReadStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

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
        let tempPath = null;

        try {
            downloadingUsers.add(userId);
            const statusMessage = await bot.sendMessage(chatId, '🔍 Fetching video information...');
            
            // Get video info using yt-dlp
            const { stdout: info } = await execAsync(`yt-dlp --dump-json "${url}"`);
            const videoInfo = JSON.parse(info);
            const videoTitle = videoInfo.title;
            tempPath = join(tmpdir(), `${Date.now()}-${userId}.mp4`);

            // Initialize download status
            await bot.editMessageText(
                `📥 Downloading: ${videoTitle}\n\n` +
                'Progress: [□□□□□□□□□□] 0%\n' +
                'Quality: Best available (up to 1080p)',
                {
                    chat_id: chatId,
                    message_id: statusMessage.message_id
                }
            );

            // Download command with progress tracking
            const downloadCmd = [
                'yt-dlp',
                '-f "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/mp4"',
                '--merge-output-format mp4',
                `--output "${tempPath}"`,
                '--no-warnings',
                '--no-playlist',
                '--progress',
                `"${url}"`
            ].join(' ');

            console.log('Executing command:', downloadCmd);

            // Execute download and wait for completion
            await new Promise((resolve, reject) => {
                const downloadProcess = exec(downloadCmd);
                let lastProgress = 0;
                
                downloadProcess.stdout.on('data', async (data) => {
                    const progressMatch = data.match(/(\d+\.?\d*)%/);
                    if (progressMatch) {
                        const progress = parseFloat(progressMatch[1]);
                        // Update progress message every 5% change
                        if (progress - lastProgress >= 5) {
                            lastProgress = progress;
                            try {
                                await bot.editMessageText(
                                    `📥 Downloading: ${videoTitle}\n\n` +
                                    `Progress: ${createProgressBar(progress)} ${progress.toFixed(1)}%\n` +
                                    'Quality: Best available (up to 1080p)',
                                    {
                                        chat_id: chatId,
                                        message_id: statusMessage.message_id
                                    }
                                );
                            } catch (error) {
                                console.error('Error updating progress:', error);
                            }
                        }
                    }
                });

                downloadProcess.stderr.on('data', (data) => {
                    console.error('Download error:', data);
                });

                downloadProcess.on('error', (error) => {
                    console.error('Process error:', error);
                    reject(error);
                });
                
                downloadProcess.on('exit', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Download failed with code ${code}`));
                    }
                });
            });

            // Verify file exists and wait for it to be fully written
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (!existsSync(tempPath)) {
                throw new Error('Download failed: File not found');
            }

            // Update status message for upload
            await bot.editMessageText(
                '📤 Uploading to Telegram...',
                {
                    chat_id: chatId,
                    message_id: statusMessage.message_id
                }
            );

            // Create a readable stream and send the file
            const fileStream = createReadStream(tempPath);
            await bot.sendVideo(chatId, fileStream, {
                caption: `🎥 ${videoTitle}`,
                reply_to_message_id: msg.message_id,
                filename: `${videoTitle}.mp4`
            });

            // Clean up
            fileStream.destroy();
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
            } else if (error.message.includes('File not found')) {
                errorMessage = '❌ Download failed. Please try again.';
            }
            
            await bot.sendMessage(chatId, errorMessage);
        } finally {
            downloadingUsers.delete(userId);
            if (tempPath && existsSync(tempPath)) {
                try {
                    await unlink(tempPath);
                } catch (cleanupError) {
                    console.error('Error cleaning up temp file:', cleanupError);
                }
            }
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

// Helper function to create a progress bar
function createProgressBar(progress) {
    const barLength = 10;
    const filledLength = Math.round((progress * barLength) / 100);
    const emptyLength = barLength - filledLength;
    
    const filled = '■'.repeat(filledLength);
    const empty = '□'.repeat(emptyLength);
    
    return `[${filled}${empty}]`;
} 