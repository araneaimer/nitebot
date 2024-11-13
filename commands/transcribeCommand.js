import { voiceService } from '../services/voiceService.js';

// Track users who are in transcribe mode
const transcribeModeUsers = new Set();

export { transcribeModeUsers };

export function setupTranscribeCommand(bot) {
    // Handle /transcribe command
    bot.onText(/\/(transcribe|trcb)/, async (msg) => {
        const chatId = msg.chat.id;
        
        // Add user to transcribe mode
        transcribeModeUsers.add(chatId);
        
        await bot.sendMessage(
            chatId, 
            '🎙️ Please send a voice message to transcribe.\n\n_Send /cancel to cancel transcription mode._', 
            { parse_mode: 'Markdown' }
        );
    });

    // Handle /cancel command
    bot.onText(/\/cancel/, (msg) => {
        const chatId = msg.chat.id;
        if (transcribeModeUsers.has(chatId)) {
            transcribeModeUsers.delete(chatId);
            bot.sendMessage(chatId, '❌ Transcription mode cancelled.');
        }
    });

    // Handle voice messages for transcription
    bot.on('voice', async (msg) => {
        const chatId = msg.chat.id;

        // Only process if user is in transcribe mode
        if (!transcribeModeUsers.has(chatId)) return;

        // Remove user from transcribe mode
        transcribeModeUsers.delete(chatId);

        const statusMessage = await bot.sendMessage(
            chatId, 
            '🎙️ *Transcribing your message...*', 
            { parse_mode: 'Markdown' }
        );

        try {
            const file = await bot.getFile(msg.voice.file_id);
            const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            
            const tempFilePath = await voiceService.downloadVoice(fileUrl);
            const transcription = await voiceService.transcribeAudio(tempFilePath);

            await bot.editMessageText(
                `🎙️ *Transcription:*\n${transcription}`, 
                {
                    chat_id: chatId,
                    message_id: statusMessage.message_id,
                    parse_mode: 'Markdown'
                }
            );
        } catch (error) {
            console.error('Error transcribing voice message:', error);
            await bot.editMessageText(
                '❌ Sorry, I had trouble transcribing your voice message. Please try again.',
                {
                    chat_id: chatId,
                    message_id: statusMessage.message_id
                }
            );
        }
    });
} 