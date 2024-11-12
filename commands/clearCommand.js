export function setupClearCommand(bot) {
    bot.onText(/\/clear(?:\s+(\S+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const param = match[1]?.toLowerCase();

        // Handle "clear all" case
        if (param === 'all') {
            const confirmMsg = await bot.sendMessage(
                chatId,
                `⚠️ WARNING:\n` +
                `This will:\n` +
                `• Clear all messages in this chat\n` +
                `• Delete all media files in this chat\n\n` +
                `Note: This only affects messages in your chat with the bot.\n\n` +
                `Are you sure? Reply with /confirm within 30 seconds to proceed.`,
                { parse_mode: 'Markdown' }
            );

            // Set up confirmation handler
            const confirmHandler = async (confirmMsg) => {
                if (confirmMsg.text === '/confirm') {
                    try {
                        // First display the cleanup progress message
                        const statusMsg = await bot.sendMessage(
                            chatId,
                            "*Cleanup in progress* ◡",
                            { parse_mode: 'Markdown' }
                        );

                        // Setup animation
                        const frames = ['◜', '◝', '◞', '◟'];
                        let frameIndex = 0;
                        const animationInterval = setInterval(() => {
                            bot.editMessageText(
                                `*Cleanup in progress* ${frames[frameIndex]}`,
                                {
                                    chat_id: chatId,
                                    message_id: statusMsg.message_id,
                                    parse_mode: 'Markdown'
                                }
                            ).catch(() => {});
                            frameIndex = (frameIndex + 1) % frames.length;
                        }, 150);

                        // Then start deleting messages
                        await bot.deleteMessage(chatId, confirmMsg.message_id);
                        await bot.deleteMessage(chatId, msg.message_id);
                        await bot.deleteMessage(chatId, confirmMsg.message_id - 1);

                        // Continue with mass message deletion
                        const deletePromises = [];
                        for (let i = msg.message_id; i > msg.message_id - 1000; i--) {
                            deletePromises.push(bot.deleteMessage(chatId, i).catch(() => {}));
                        }

                        await Promise.all(deletePromises);
                        clearInterval(animationInterval);
                        
                        // Delete all service messages
                        await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
                        await bot.deleteMessage(chatId, confirmMsg.message_id).catch(() => {});
                        await bot.deleteMessage(chatId, msg.message_id).catch(() => {}); // Original command message
                        
                        const finalMessage = await bot.sendMessage(
                            chatId,
                            `🧹 *Cleanup Complete*\n\n` +
                            `Messages have been deleted.\n\n` +
                            `Note: Messages older than 48 hours cannot be deleted.\n\n` +
                            `_This message will self-destruct in 30 seconds..._`,
                            { parse_mode: 'Markdown' }
                        );

                        setTimeout(async () => {
                            await bot.deleteMessage(chatId, finalMessage.message_id).catch(() => {});
                        }, 30000);

                    } catch (error) {
                        clearInterval(animationInterval);
                        console.error('Clear command failed:', error);
                        const errorMsg = await bot.sendMessage(chatId, 
                            "❌ Error during cleanup. Some messages may not have been deleted.");
                        
                        setTimeout(async () => {
                            await bot.deleteMessage(chatId, errorMsg.message_id).catch(() => {});
                        }, 30000);
                    }
                    
                    // Remove the confirmation handler
                    bot.removeListener('message', confirmHandler);
                }
            };

            // Add temporary confirmation handler
            bot.on('message', confirmHandler);

            // Set timeout to remove the confirmation handler
            setTimeout(() => {
                bot.removeListener('message', confirmHandler);
                bot.deleteMessage(chatId, confirmMsg.message_id).catch(() => {});
            }, 30000);

            return;
        }

        const amount = parseInt(param) || 100;

        // Start the cleanup with animation
        const statusMsg = await bot.sendMessage(
            chatId,
            "*Cleanup in progress* ◡",
            { parse_mode: 'Markdown' }
        );

        // Animation frames - adjusted for smoother rotation
        const frames = ['◜', '◝', '◞', '◟'];
        let frameIndex = 0;
        const animationInterval = setInterval(() => {
            bot.editMessageText(
                `*Cleanup in progress* ${frames[frameIndex]}`,
                {
                    chat_id: chatId,
                    message_id: statusMsg.message_id,
                    parse_mode: 'Markdown'
                }
            ).catch(() => {});
            frameIndex = (frameIndex + 1) % frames.length;
        }, 150);

        try {
            // Create an array of promises for all delete operations
            const deletePromises = [];
            for (let i = msg.message_id; i > msg.message_id - amount; i--) {
                deletePromises.push(bot.deleteMessage(chatId, i).catch(() => {}));
            }

            // Execute all delete operations simultaneously
            await Promise.all(deletePromises);

            // Clear the animation interval and delete the status message
            clearInterval(animationInterval);
            try {
                await bot.deleteMessage(chatId, statusMsg.message_id);
                await bot.deleteMessage(chatId, msg.message_id);
                if (confirmMsg) {
                    await bot.deleteMessage(chatId, confirmMsg.message_id);
                }
            } catch (error) {
                console.error('Error deleting service messages:', error);
            }
            
            const finalMessage = await bot.sendMessage(
                chatId,
                `🧹 *Cleanup Complete*\n\n` +
                `Messages have been deleted.\n\n` +
                `Note: Messages older than 48 hours cannot be deleted.\n\n` +
                `_This message will self-destruct in 30 seconds..._`,
                { parse_mode: 'Markdown' }
            );

            // Delete the final message after 30 seconds
            setTimeout(async () => {
                try {
                    await bot.deleteMessage(chatId, finalMessage.message_id);
                } catch (error) {
                    console.error('Error deleting final message:', error);
                }
            }, 30000);

        } catch (error) {
            clearInterval(animationInterval);
            console.error('Clear command failed:', error);
            const errorMsg = await bot.sendMessage(chatId, 
                "❌ Error during cleanup. Some messages may not have been deleted.");
            
            setTimeout(async () => {
                await bot.deleteMessage(chatId, errorMsg.message_id).catch(() => {});
            }, 30000);
        }
    });
}