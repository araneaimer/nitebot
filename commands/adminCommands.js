const userSet = new Set(); // Stores unique user IDs

// Track active chat IDs (you might want to persist this in a database later)
const activeChatIds = new Set();

const adminCommands = [
    {
        command: '/stats',
        description: 'Shows bot statistics including total users and last update time',
        usage: 'Just type /stats',
        example: '/stats'
    },
    {
        command: '/broadcast',
        description: 'Sends a message to all bot users',
        usage: '/broadcast <message>',
        example: '/broadcast Hello everyone! Bot maintenance in 1 hour.'
    },
    {
        command: '/previewbroadcast',
        description: 'Preview how your broadcast message will look',
        usage: '/previewbroadcast <message>',
        example: '/previewbroadcast *Important Update*: New features!'
    },
    {
        command: '/broadcastinfo',
        description: 'Shows information about potential broadcast recipients',
        usage: 'Just type /broadcastinfo',
        example: '/broadcastinfo'
    },
    {
        command: '/maintenance',
        description: 'Controls bot maintenance mode',
        usage: '/maintenance <stop|start>',
        example: '/maintenance stop'
    },
    {
        command: '/clearstats',
        description: 'Resets all bot statistics',
        usage: 'Just type /clearstats',
        example: '/clearstats'
    }
];

const COMMANDS_PER_PAGE = 2;

export const setupAdminCommands = (bot) => {
    const ADMIN_USER_ID = process.env.ADMIN_USER_ID; // Add this to your .env file

    // Middleware to check if user is admin
    const isAdmin = (msg) => {
        const userId = msg.from.id.toString();
        return userId === ADMIN_USER_ID;
    };

    // Track new users but exclude admin
    bot.on('message', (msg) => {
        const userId = msg.from.id.toString();
        if (userId && userId !== ADMIN_USER_ID) {
            userSet.add(userId);
            activeChatIds.add(msg.chat.id);
        }
    });

    // Command to get bot statistics
    bot.onText(/\/stats/, async (msg) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }
        
        try {
            const stats = {
                totalUsers: userSet.size,
                lastUpdated: new Date().toLocaleString()
            };
            
            await bot.sendMessage(msg.chat.id, 
                `📊 *Bot Statistics*\n\n` +
                `Total Unique Users: ${stats.totalUsers}\n` +
                `Last Updated: ${stats.lastUpdated}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Stats command error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error fetching statistics.");
        }
    });

    // Clear stats command (admin only)
    bot.onText(/\/clearstats/, async (msg) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        try {
            userSet.clear();
            await bot.sendMessage(msg.chat.id, "✅ Statistics have been cleared.");
        } catch (error) {
            console.error('Clear stats error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error clearing statistics.");
        }
    });

    // Broadcast command with status reporting
    bot.onText(/\/broadcast (.+)/, async (msg, match) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        const broadcastMessage = match[1];
        const successfulSends = [];
        const failedSends = [];

        // Send initial status message
        const statusMsg = await bot.sendMessage(
            msg.chat.id,
            "🚀 Starting broadcast...\n\nMessage:\n" + broadcastMessage
        );

        // Broadcast to all active chats
        for (const chatId of activeChatIds) {
            try {
                await bot.sendMessage(chatId, 
                    `📢 *Broadcast Message*\n\n${broadcastMessage}`, 
                    { parse_mode: 'Markdown' }
                );
                successfulSends.push(chatId);
            } catch (error) {
                console.error(`Failed to send to ${chatId}:`, error);
                failedSends.push(chatId);
                
                // Remove inactive chats
                if (error.response?.statusCode === 403) {
                    activeChatIds.delete(chatId);
                }
            }

            // Update status every 5 sends
            if ((successfulSends.length + failedSends.length) % 5 === 0) {
                await updateBroadcastStatus(bot, statusMsg.chat.id, statusMsg.message_id, 
                    successfulSends.length, failedSends.length);
            }
        }

        // Send final status
        await bot.editMessageText(
            `📊 *Broadcast Complete*\n\n` +
            `✅ Successfully sent: ${successfulSends.length}\n` +
            `❌ Failed: ${failedSends.length}\n` +
            `📝 Message:\n${broadcastMessage}`,
            {
                chat_id: statusMsg.chat.id,
                message_id: statusMsg.message_id,
                parse_mode: 'Markdown'
            }
        );
    });

    // Preview broadcast command
    bot.onText(/\/previewbroadcast (.+)/, async (msg, match) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        const broadcastMessage = match[1];
        
        await bot.sendMessage(
            msg.chat.id,
            `📢 *Preview of Broadcast Message*\n\n${broadcastMessage}`,
            { parse_mode: 'Markdown' }
        );
    });

    // Get broadcast audience size
    bot.onText(/\/broadcastinfo/, async (msg) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        await bot.sendMessage(
            msg.chat.id,
            `📊 *Broadcast Information*\n\n` +
            `Total potential recipients: ${activeChatIds.size}\n\n` +
            `Use /previewbroadcast <message> to test your message\n` +
            `Use /broadcast <message> to send to all users`,
            { parse_mode: 'Markdown' }
        );
    });

    // Command to stop/restart bot
    bot.onText(/\/maintenance (.+)/, async (msg, match) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        const action = match[1].toLowerCase();
        try {
            if (action === 'stop') {
                await bot.sendMessage(msg.chat.id, "🔄 Bot is going into maintenance mode...");
                // Implement your stop logic
            } else if (action === 'start') {
                await bot.sendMessage(msg.chat.id, "✅ Bot is now active again!");
                // Implement your start logic
            }
        } catch (error) {
            console.error('Maintenance command error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error executing maintenance command.");
        }
    });

    // Helper function to generate help message for a specific page
    const generateHelpMessage = (page) => {
        const totalPages = Math.ceil(adminCommands.length / COMMANDS_PER_PAGE);
        const startIdx = (page - 1) * COMMANDS_PER_PAGE;
        const commands = adminCommands.slice(startIdx, startIdx + COMMANDS_PER_PAGE);

        let message = `📚 *Admin Commands Help* (Page ${page}/${totalPages})\n\n`;
        
        commands.forEach(cmd => {
            message += `*${cmd.command}*\n`;
            message += `📝 Description: ${cmd.description}\n`;
            message += `🔍 Usage: ${cmd.usage}\n`;
            message += `💡 Example: \`${cmd.example}\`\n\n`;
        });

        return message;
    };

    // Helper function to create keyboard buttons
    const generateKeyboard = (currentPage) => {
        const totalPages = Math.ceil(adminCommands.length / COMMANDS_PER_PAGE);
        const buttons = [];

        if (currentPage > 1) {
            buttons.push({
                text: '⬅️ Previous',
                callback_data: `admin_help_${currentPage - 1}`
            });
        }

        if (currentPage < totalPages) {
            buttons.push({
                text: 'Next ➡️',
                callback_data: `admin_help_${currentPage + 1}`
            });
        }

        return {
            reply_markup: {
                inline_keyboard: [buttons]
            }
        };
    };

    // Admin help command
    bot.onText(/\/admin/, async (msg) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        try {
            const message = generateHelpMessage(1);
            await bot.sendMessage(
                msg.chat.id,
                message,
                {
                    parse_mode: 'Markdown',
                    ...generateKeyboard(1)
                }
            );
        } catch (error) {
            console.error('Admin help command error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error displaying admin help.");
        }
    });

    // Handle callback queries for pagination
    bot.on('callback_query', async (query) => {
        if (!isAdmin({ from: query.from })) {
            return bot.answerCallbackQuery(query.id, "⛔ This action is only available for administrators.");
        }

        if (query.data.startsWith('admin_help_')) {
            const page = parseInt(query.data.split('_')[2]);
            
            try {
                const message = generateHelpMessage(page);
                await bot.editMessageText(message, {
                    chat_id: query.message.chat.id,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    ...generateKeyboard(page)
                });
                await bot.answerCallbackQuery(query.id);
            } catch (error) {
                console.error('Admin help pagination error:', error);
                await bot.answerCallbackQuery(query.id, "❌ Error updating help message.");
            }
        }
    });
};

// Helper function to update broadcast status
async function updateBroadcastStatus(bot, chatId, messageId, successful, failed) {
    try {
        await bot.editMessageText(
            `🚀 *Broadcasting in Progress*\n\n` +
            `✅ Sent: ${successful}\n` +
            `❌ Failed: ${failed}\n\n` +
            `Please wait...`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );
    } catch (error) {
        console.error('Error updating broadcast status:', error);
    }
} 