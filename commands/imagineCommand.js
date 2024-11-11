import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGING_FACE_TOKEN);

const MODELS = {
    'FLUX Dev': 'black-forest-labs/FLUX.1-dev',
    'FLUX Schnell': 'black-forest-labs/FLUX.1-schnell',
    'FLUX Realism': 'XLabs-AI/flux-RealismLora',
    'FLUX Logo': 'Shakker-Labs/FLUX.1-dev-LoRA-Logo-Design',
    'FLUX Koda': 'alvdansen/flux-koda',
    'Anime Style': 'alvdansen/softserve_anime'
};

export function setupImageCommand(bot) {
    const userSessions = new Map();

    // Helper function to create model selection keyboard
    const getModelKeyboard = () => ({
        inline_keyboard: Object.keys(MODELS).map(name => ([{
            text: name,
            callback_data: `generate_${name}`
        }]))
    });

    // Helper function to create image action buttons
    const getImageActionButtons = (prompt) => ({
        inline_keyboard: [[
            {
                text: '🎲 Regenerate',
                callback_data: `regenerate_${prompt}`
            },
            {
                text: '✨ Upscale',
                callback_data: 'upscale_pending'
            }
        ]]
    });

    bot.onText(/\/(imagine|im) (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const prompt = match[1];
        
        userSessions.set(chatId, {
            prompt,
            originalMessageId: msg.message_id
        });

        await bot.sendMessage(
            chatId,
            '🎨 Choose a model for image generation:',
            { 
                reply_markup: getModelKeyboard(),
                reply_to_message_id: msg.message_id
            }
        );
    });

    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        // Handle regenerate button
        if (query.data.startsWith('regenerate_')) {
            const prompt = query.data.replace('regenerate_', '');
            
            // Store new session with original prompt
            userSessions.set(chatId, {
                prompt,
                originalMessageId: query.message.reply_to_message?.message_id
            });

            await bot.sendMessage(
                chatId,
                '🎨 Choose a model for regeneration:',
                { 
                    reply_markup: getModelKeyboard(),
                    reply_to_message_id: query.message.reply_to_message?.message_id
                }
            );
            
            try {
                await bot.answerCallbackQuery(query.id);
            } catch (error) {
                console.error(`Failed to answer callback query: ${error.message}`);
                // Continue execution since this is not a critical error
            }
            return;
        }

        // Handle upscale button (pending feature)
        if (query.data === 'upscale_pending') {
            await bot.answerCallbackQuery(query.id, {
                text: '⚙️ Upscaling feature coming soon!',
                show_alert: true
            });
            return;
        }

        // Handle model selection
        if (query.data.startsWith('generate_')) {
            const modelName = query.data.replace('generate_', '');
            const modelId = MODELS[modelName];
            const session = userSessions.get(chatId);

            if (!session) {
                await bot.answerCallbackQuery(query.id, {
                    text: '❌ Session expired. Please start over with /imagine command.',
                    show_alert: true
                });
                return;
            }

            await bot.editMessageText(
                `🎨 Generating image using ${modelName}...`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { inline_keyboard: [] }
                }
            );

            try {
                console.log(`Starting generation with ${modelName}...`);
                const response = await hf.textToImage({
                    model: modelId,
                    inputs: session.prompt,
                });
                console.log(`${modelName}: 200 DONE`);

                const buffer = Buffer.from(await response.arrayBuffer());

                // Send image with regenerate and upscale buttons
                await bot.sendPhoto(chatId, buffer, {
                    caption: `*${modelName}*`,
                    parse_mode: 'Markdown',
                    reply_to_message_id: session.originalMessageId,
                    reply_markup: getImageActionButtons(session.prompt)
                });

                await bot.editMessageText(
                    `✨ Successfully generated image using ${modelName}!`,
                    {
                        chat_id: chatId,
                        message_id: messageId
                    }
                );

            } catch (error) {
                console.error(`${modelName}: ${error.message}`);
                
                try {
                    await bot.editMessageText(
                        `❌ Failed to generate image using ${modelName}. Please try again.`,
                        {
                            chat_id: chatId,
                            message_id: messageId
                        }
                    );
                } catch (editError) {
                    // If editing fails, send a new message instead
                    await bot.sendMessage(
                        chatId,
                        `❌ Failed to generate image using ${modelName}. Please try again.`,
                        {
                            reply_to_message_id: session.originalMessageId
                        }
                    );
                }
            }

            userSessions.delete(chatId);
            try {
                await bot.answerCallbackQuery(query.id);
            } catch (error) {
                console.error(`Failed to answer callback query: ${error.message}`);
                // Continue execution since this is not a critical error
            }
        }
    });
} 