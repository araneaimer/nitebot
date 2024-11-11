let maintenanceMode = false;
let maintenanceStartTime = null;
const userSet = new Set();

// Track active chat IDs (you might want to persist this in a database later)
const activeChatIds = new Set();

let notifyEnabled = true;
const MONITORED_CHAT_ID = '5245253271';

const commandUsageStats = new Map(); // Tracks command usage frequency
let lastUserCommand = null; // Stores the last command from monitored user

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
    },
    {
        command: '/ping',
        description: 'Check bot response time and status',
        usage: 'Just type /ping',
        example: '/ping'
    },
    {
        command: '/debug',
        description: 'Show system information and bot health',
        usage: 'Just type /debug',
        example: '/debug'
    },
    {
        command: '/clear',
        description: 'Clear messages in current admin chat',
        usage: '/clear [number of messages | all]',
        example: '/clear 50 or /clear all'
    },
    {
        command: '/notify',
        description: 'Toggle notifications for specific user activity',
        usage: 'Just type /notify',
        example: '/notify'
    },
    {
        command: '/overview',
        description: 'Shows command usage statistics and recent activity',
        usage: 'Just type /overview',
        example: '/overview'
    }
];

const COMMANDS_PER_PAGE = 4;

export const setupAdminCommands = (bot) => {
    const ADMIN_USER_ID = process.env.ADMIN_USER_ID; // Add this to your .env file

    // Middleware to check if user is admin
    const isAdmin = (msg) => {
        const userId = msg.from.id.toString();
        return userId === ADMIN_USER_ID;
    };

    // Middleware to check maintenance mode
    bot.on('message', async (msg) => {
        // Always allow admin
        if (isAdmin(msg)) return;

        // If in maintenance mode, block all non-admin messages
        if (maintenanceMode) {
            const maintenanceTime = maintenanceStartTime 
                ? `\nMaintenance started: ${maintenanceStartTime.toLocaleString()}`
                : '';

            await bot.sendMessage(msg.chat.id, 
                `🛠 *Bot is currently under maintenance*\n\n` +
                `We're performing some updates to improve our service.${maintenanceTime}\n\n` +
                `Please try again later!`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Track user if not in maintenance mode
        if (msg.from.id) {
            userSet.add(msg.from.id.toString());
        }
    });

    // Enhanced maintenance command
    bot.onText(/\/maintenance (.+)/, async (msg, match) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        const action = match[1].toLowerCase();
        try {
            switch (action) {
                case 'on':
                case 'start':
                    maintenanceMode = true;
                    maintenanceStartTime = new Date();
                    await bot.sendMessage(msg.chat.id, 
                        "🛠 *Maintenance Mode Activated*\n\n" +
                        "• All non-admin commands are now disabled\n" +
                        "• Users will see maintenance message\n" +
                        "• Use `/maintenance off` to deactivate",
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case 'off':
                case 'stop':
                    maintenanceMode = false;
                    const duration = maintenanceStartTime 
                        ? `\nMaintenance duration: ${getTimeDifference(maintenanceStartTime, new Date())}`
                        : '';
                    maintenanceStartTime = null;
                    await bot.sendMessage(msg.chat.id, 
                        "✅ *Maintenance Mode Deactivated*\n\n" +
                        "• Bot is now fully operational\n" +
                        "• All commands are enabled" +
                        duration,
                        { parse_mode: 'Markdown' }
                    );
                    break;

                case 'status':
                    const status = maintenanceMode
                        ? `🛠 *Maintenance Mode is ACTIVE*\n\nStarted: ${maintenanceStartTime.toLocaleString()}\nDuration: ${getTimeDifference(maintenanceStartTime, new Date())}`
                        : "✅ *Maintenance Mode is OFF*\n\nBot is operating normally";
                    await bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
                    break;

                default:
                    await bot.sendMessage(msg.chat.id,
                        "❌ *Invalid maintenance command*\n\n" +
                        "Valid options:\n" +
                        "• `/maintenance on` - Enable maintenance mode\n" +
                        "• `/maintenance off` - Disable maintenance mode\n" +
                        "• `/maintenance status` - Check current status",
                        { parse_mode: 'Markdown' }
                    );
            }
        } catch (error) {
            console.error('Maintenance command error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error executing maintenance command.");
        }
    });

    // Enhanced stats command with maintenance info
    bot.onText(/\/stats/, async (msg) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }
        
        try {
            const maintenanceStatus = maintenanceMode
                ? `🛠 *MAINTENANCE MODE ACTIVE*\n` +
                  `Started: ${maintenanceStartTime.toLocaleString()}\n` +
                  `Duration: ${getTimeDifference(maintenanceStartTime, new Date())}\n\n`
                : '✅ Bot is operating normally\n\n';

            const stats = {
                totalUsers: userSet.size,
                lastUpdated: new Date().toLocaleString()
            };
            
            await bot.sendMessage(msg.chat.id, 
                `📊 *Bot Statistics*\n\n` +
                maintenanceStatus +
                `Total Unique Users: ${stats.totalUsers}\n` +
                `Last Updated: ${stats.lastUpdated}`,
                { parse_mode: 'Markdown' }
            );
        } catch (error) {
            console.error('Stats command error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error fetching statistics.");
        }
    });

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

    bot.onText(/\/ping/, async (msg) => {
        if (!isAdmin(msg)) return;
        
        const start = Date.now();
        const message = await bot.sendMessage(msg.chat.id, "🏓 Pinging...");
        const end = Date.now();
        
        await bot.editMessageText(
            `🏓 Pong!\n\n` +
            `Response time: ${end - start}ms\n` +
            `Bot status: Online ✅\n` +
            `Server time: ${new Date().toLocaleString()}`,
            {
                chat_id: msg.chat.id,
                message_id: message.message_id
            }
        );
    });

    bot.onText(/\/poll (.+)/, async (msg, match) => {
        if (!isAdmin(msg)) return;
        
        const parts = match[1].split('|').map(part => part.trim());
        const question = parts[0];
        const options = parts.slice(1);
        
        if (options.length < 2) {
            return bot.sendMessage(msg.chat.id, 
                "❌ Please provide at least 2 options separated by |");
        }
        
        // Send poll to all users
        for (const chatId of activeChatIds) {
            try {
                await bot.sendPoll(chatId, question, options, {
                    is_anonymous: false
                });
            } catch (error) {
                console.error(`Failed to send poll to ${chatId}:`, error);
            }
        }
    });

    bot.onText(/\/debug/, async (msg) => {
        if (!isAdmin(msg)) return;
        
        const memory = process.memoryUsage();
        const uptime = process.uptime();
        
        await bot.sendMessage(msg.chat.id,
            `🔍 *Debug Information*\n\n` +
            `*System:*\n` +
            `• Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n` +
            `• Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB\n\n` +
            `*Bot Stats:*\n` +
            `• Active Users: ${userSet.size}\n` +
            `• Active Chats: ${activeChatIds.size}\n` +
            `• Maintenance: ${maintenanceMode ? 'ON 🛠' : 'OFF ✅'}\n` +
            `• Node Version: ${process.version}`,
            { parse_mode: 'Markdown' }
        );
    });

    bot.onText(/\/clear(?:\s+(\S+))?/, async (msg, match) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        const param = match[1]?.toLowerCase();

        // Handle "clear all" case
        if (param === 'all') {
            const confirmMsg = await bot.sendMessage(
                msg.chat.id,
                `⚠️ *WARNING*: This will:\n` +
                `• Clear all messages in this admin chat\n` +
                `• Delete all media files in this chat\n\n` +
                `Note: This only affects messages in your chat with the bot. ` +
                `Users' private chats with the bot are unaffected.\n\n` +
                `Are you sure? Reply with /confirm within 30 seconds to proceed.`,
                { parse_mode: 'Markdown' }
            );

            // Set up confirmation handler
            const confirmHandler = async (confirmMsg) => {
                if (confirmMsg.text === '/confirm' && confirmMsg.from.id.toString() === process.env.ADMIN_USER_ID) {
                    try {
                        // Clear messages
                        const statusMsg = await bot.sendMessage(msg.chat.id, "🗑 Starting full cleanup...");
                        let deletedCount = 0;
                        
                        // Delete recent messages
                        for (let i = msg.message_id; i > msg.message_id - 1000; i--) {
                            try {
                                await bot.deleteMessage(msg.chat.id, i);
                                deletedCount++;
                            } catch (error) {
                                continue;
                            }
                        }
                        
                        const finalMessage = await bot.sendMessage(
                            msg.chat.id,
                            `🧹 *Complete Cleanup*\n\n` +
                            `✅ Deleted ${deletedCount} messages\n\n` +
                            `_This message will self-destruct in 30 seconds..._`,
                            { parse_mode: 'Markdown' }
                        );

                        // Delete the final message after 30 seconds
                        setTimeout(async () => {
                            try {
                                await bot.deleteMessage(msg.chat.id, finalMessage.message_id);
                            } catch (error) {
                                console.error('Error deleting final message:', error);
                            }
                        }, 30000);

                    } catch (error) {
                        console.error('Clear all error:', error);
                        const errorMsg = await bot.sendMessage(msg.chat.id, "❌ Error during cleanup.");
                        
                        setTimeout(async () => {
                            try {
                                await bot.deleteMessage(msg.chat.id, errorMsg.message_id);
                            } catch (error) {
                                console.error('Error deleting error message:', error);
                            }
                        }, 30000);
                    }
                }
                // Remove the confirmation handler
                bot.removeListener('message', confirmHandler);
            };

            // Add temporary confirmation handler
            bot.on('message', confirmHandler);

            // Remove confirmation handler after 30 seconds
            setTimeout(() => {
                bot.removeListener('message', confirmHandler);
                try {
                    bot.deleteMessage(msg.chat.id, confirmMsg.message_id);
                } catch (error) {
                    console.error('Error deleting confirmation message:', error);
                }
            }, 30000);

            return;
        }

        // Original clear messages functionality
        const amount = parseInt(param) || 100;
        const statusMsg = await bot.sendMessage(msg.chat.id, "🗑 Starting cleanup...");
        let deletedCount = 0;
        let failedCount = 0;

        try {
            // Get message IDs from current to older messages
            for (let i = msg.message_id; i > msg.message_id - amount; i--) {
                try {
                    await bot.deleteMessage(msg.chat.id, i);
                    deletedCount++;

                    // Update status every 10 deletions
                    if (deletedCount % 10 === 0) {
                        await bot.editMessageText(
                            `🗑 Cleaning messages...\n\n` +
                            `✅ Deleted: ${deletedCount}\n` +
                            `❌ Failed: ${failedCount}`,
                            {
                                chat_id: msg.chat.id,
                                message_id: statusMsg.message_id
                            }
                        );
                    }
                } catch (error) {
                    failedCount++;
                    continue;
                }
            }

            // Send final status
            const finalMessage = await bot.editMessageText(
                `🧹 *Cleanup Complete*\n\n` +
                `✅ Successfully deleted: ${deletedCount} messages\n` +
                `❌ Failed/Skipped: ${failedCount} messages\n\n` +
                `Note: Messages older than 48 hours cannot be deleted.\n\n` +
                `_This message will self-destruct in 30 seconds..._`,
                {
                    chat_id: msg.chat.id,
                    message_id: statusMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );

            // Delete the cleanup status message after 30 seconds
            setTimeout(async () => {
                try {
                    await bot.deleteMessage(msg.chat.id, finalMessage.message_id);
                } catch (error) {
                    console.error('Error deleting cleanup status message:', error);
                }
            }, 30000);

        } catch (error) {
            console.error('Clear command error:', error);
            const errorMsg = await bot.sendMessage(msg.chat.id, 
                "❌ Error during cleanup. Some messages may not have been deleted.");
            
            // Delete error message after 30 seconds too
            setTimeout(async () => {
                try {
                    await bot.deleteMessage(msg.chat.id, errorMsg.message_id);
                } catch (error) {
                    console.error('Error deleting error message:', error);
                }
            }, 30000);
        }
    });

    bot.onText(/\/notify/, async (msg) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        try {
            // Get user profile information
            const userInfo = await bot.getChat(MONITORED_CHAT_ID);
            
            // Get user's profile photos
            const photos = await bot.getUserProfilePhotos(MONITORED_CHAT_ID, 0, 1);
            
            // First send user info with photo if available
            if (photos && photos.photos.length > 0) {
                const photoId = photos.photos[0][0].file_id;
                await bot.sendPhoto(msg.chat.id, photoId, {
                    caption: `🔔 *Notification Settings*\n\n` +
                        `👤 *Monitored User:*\n` +
                        `• Name: ${userInfo.first_name}${userInfo.last_name ? ' ' + userInfo.last_name : ''}\n` +
                        `• Username: ${userInfo.username ? '@' + userInfo.username : 'N/A'}\n` +
                        `• Chat ID: \`${MONITORED_CHAT_ID}\`\n` +
                        `• Bio: ${userInfo.bio || 'N/A'}\n\n` +
                        `Current Status: ${notifyEnabled ? '✅ ON' : '❌ OFF'}`,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '✅ Turn ON', callback_data: 'notify_on' },
                            { text: '❌ Turn OFF', callback_data: 'notify_off' }
                        ]]
                    }
                });
            } else {
                // Send without photo if no profile picture is available
                await bot.sendMessage(
                    msg.chat.id,
                    `🔔 *Notification Settings*\n\n` +
                    `👤 *Monitored User:*\n` +
                    `• Name: ${userInfo.first_name}${userInfo.last_name ? ' ' + userInfo.last_name : ''}\n` +
                    `• Username: ${userInfo.username ? '@' + userInfo.username : 'N/A'}\n` +
                    `• Chat ID: \`${MONITORED_CHAT_ID}\`\n` +
                    `• Bio: ${userInfo.bio || 'N/A'}\n\n` +
                    `Current Status: ${notifyEnabled ? '✅ ON' : '❌ OFF'}`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✅ Turn ON', callback_data: 'notify_on' },
                                { text: '❌ Turn OFF', callback_data: 'notify_off' }
                            ]]
                        }
                    }
                );
            }
        } catch (error) {
            console.error('Notify command error:', error);
            await bot.sendMessage(msg.chat.id, 
                "❌ Error fetching user information or managing notifications.");
        }
    });

    bot.on('callback_query', async (query) => {
        if (!isAdmin({ from: query.from })) {
            return bot.answerCallbackQuery(query.id, "⛔ This action is only available for administrators.");
        }

        if (query.data.startsWith('notify_')) {
            const action = query.data.split('_')[1];
            
            try {
                // Get user profile information
                const userInfo = await bot.getChat(MONITORED_CHAT_ID);
                
                switch (action) {
                    case 'on':
                        notifyEnabled = true;
                        await bot.editMessageText(
                            `🔔 *Notification Settings*\n\n` +
                            `👤 *Monitored User:*\n` +
                            `• Name: ${userInfo.first_name}${userInfo.last_name ? ' ' + userInfo.last_name : ''}\n` +
                            `• Username: ${userInfo.username ? '@' + userInfo.username : 'N/A'}\n` +
                            `• Chat ID: \`${MONITORED_CHAT_ID}\`\n` +
                            `• Bio: ${userInfo.bio || 'N/A'}\n\n` +
                            `Status: ✅ Notifications ENABLED`,
                            {
                                chat_id: query.message.chat.id,
                                message_id: query.message.message_id,
                                parse_mode: 'Markdown',
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: '✅ Turn ON', callback_data: 'notify_on' },
                                        { text: '❌ Turn OFF', callback_data: 'notify_off' }
                                    ]]
                                }
                            }
                        );
                        break;

                    case 'off':
                        notifyEnabled = false;
                        await bot.editMessageText(
                            `🔔 *Notification Settings*\n\n` +
                            `👤 *Monitored User:*\n` +
                            `• Name: ${userInfo.first_name}${userInfo.last_name ? ' ' + userInfo.last_name : ''}\n` +
                            `• Username: ${userInfo.username ? '@' + userInfo.username : 'N/A'}\n` +
                            `• Chat ID: \`${MONITORED_CHAT_ID}\`\n` +
                            `• Bio: ${userInfo.bio || 'N/A'}\n\n` +
                            `Status: ❌ Notifications DISABLED`,
                            {
                                chat_id: query.message.chat.id,
                                message_id: query.message.message_id,
                                parse_mode: 'Markdown',
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: '✅ Turn ON', callback_data: 'notify_on' },
                                        { text: '❌ Turn OFF', callback_data: 'notify_off' }
                                    ]]
                                }
                            }
                        );
                        break;
                }
                await bot.answerCallbackQuery(query.id);
            } catch (error) {
                console.error('Notify button error:', error);
                await bot.answerCallbackQuery(query.id, "❌ Error updating notification settings");
            }
        }
    });

    bot.on('message', async (msg) => {
        // Skip if notifications are disabled or if it's not the monitored chat
        if (!notifyEnabled || msg.from.id.toString() !== MONITORED_CHAT_ID) {
            return;
        }

        const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
        
        try {
            // Format the notification message
            let notificationText = `👤 *Monitored User Activity*\n\n`;
            notificationText += `From: ${msg.from.first_name}${msg.from.last_name ? ' ' + msg.from.last_name : ''}\n`;
            notificationText += `Username: ${msg.from.username ? '@' + msg.from.username : 'N/A'}\n`;
            notificationText += `Chat ID: \`${msg.from.id}\`\n\n`;

            // Add message content based on type
            if (msg.text) {
                notificationText += `Message: "${msg.text}"`;
            } else if (msg.photo) {
                notificationText += `Sent a photo${msg.caption ? ` with caption: "${msg.caption}"` : ''}`;
            } else if (msg.document) {
                notificationText += `Sent a document: "${msg.document.file_name}"`;
            } else if (msg.voice) {
                notificationText += `Sent a voice message`;
            } else if (msg.video) {
                notificationText += `Sent a video${msg.caption ? ` with caption: "${msg.caption}"` : ''}`;
            } else {
                notificationText += `Sent a message (type: ${Object.keys(msg).find(key => msg[key] && typeof msg[key] === 'object')})`;
            }

            // Send notification to admin
            await bot.sendMessage(ADMIN_USER_ID, notificationText, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    });

    // Update the message handler to track command usage
    bot.on('message', async (msg) => {
        if (msg.from.id.toString() === MONITORED_CHAT_ID) {
            // Track command usage if it's a command
            if (msg.text && msg.text.startsWith('/')) {
                const command = msg.text.split(' ')[0]; // Get the command part
                commandUsageStats.set(
                    command, 
                    (commandUsageStats.get(command) || 0) + 1
                );

                // Update last command
                lastUserCommand = {
                    command: command,
                    timestamp: Date.now(),
                    context: msg.text.substring(command.length).trim() || null
                };
            }

            // Continue with existing notification logic
            if (notifyEnabled) {
                // ... existing notification code ...
            }
        }
    });

    // Optional: Add a command to reset statistics
    bot.onText(/\/resetstats/, async (msg) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        commandUsageStats.clear();
        lastUserCommand = null;
        await bot.sendMessage(msg.chat.id, "✅ Command statistics have been reset.");
    });

    bot.onText(/\/overview/, async (msg) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        try {
            // Get user profile information
            const userInfo = await bot.getChat(MONITORED_CHAT_ID);
            const photos = await bot.getUserProfilePhotos(MONITORED_CHAT_ID, 0, 1);

            // Sort commands by usage
            const sortedCommands = [...commandUsageStats.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5); // Get top 5 most used commands

            // Format command usage statistics
            let statsText = sortedCommands.length > 0 
                ? sortedCommands.map((entry, index) => 
                    `${index + 1}. ${entry[0]}: ${entry[1]} times`).join('\n')
                : 'No commands used yet';

            // Format last command info
            let lastCommandText = lastUserCommand 
                ? `\n\nLast Command: ${lastUserCommand.command}\n` +
                  `Time: ${new Date(lastUserCommand.timestamp).toLocaleString()}\n` +
                  `Context: ${lastUserCommand.context || 'No context'}`
                : '\n\nNo recent commands';

            const overviewText = 
                `📊 *Bot Activity Overview*\n\n` +
                `👤 *Monitored User:*\n` +
                `• Name: ${userInfo.first_name}${userInfo.last_name ? ' ' + userInfo.last_name : ''}\n` +
                `• Username: ${userInfo.username ? '@' + userInfo.username : 'N/A'}\n` +
                `• Notifications: ${notifyEnabled ? '✅ ON' : '❌ OFF'}\n\n` +
                `📈 *Most Used Commands:*\n${statsText}\n` +
                `🕒 *Recent Activity:*${lastCommandText}\n\n` +
                `_Last updated: ${new Date().toLocaleString()}_`;

            // Send with photo if available
            if (photos && photos.photos.length > 0) {
                const photoId = photos.photos[0][0].file_id;
                await bot.sendPhoto(msg.chat.id, photoId, {
                    caption: overviewText,
                    parse_mode: 'Markdown'
                });
            } else {
                await bot.sendMessage(msg.chat.id, overviewText, {
                    parse_mode: 'Markdown'
                });
            }

        } catch (error) {
            console.error('Overview command error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error generating overview.");
        }
    });
};

// Helper function to generate help message for a specific page
const generateHelpMessage = (page) => {
    const totalPages = Math.ceil(adminCommands.length / COMMANDS_PER_PAGE);
    const startIdx = (page - 1) * COMMANDS_PER_PAGE;
    const commands = adminCommands.slice(startIdx, startIdx + COMMANDS_PER_PAGE);

    let message = `📚 *Admin Commands Help* (Page ${page}/${totalPages})\n\n`;
    
    commands.forEach(cmd => {
        message += `*${cmd.command}*\n`;
        message += `├ ${cmd.description}\n`;
        message += `├ Usage: ${cmd.usage}\n`;
        message += `└ Ex: \`${cmd.example}\`\n\n`;
    });

    message += `_Use the buttons below to navigate_`;
    return message;
};

// Helper function to create keyboard buttons
const generateKeyboard = (currentPage) => {
    const totalPages = Math.ceil(adminCommands.length / COMMANDS_PER_PAGE);
    const buttons = [];

    if (currentPage > 1) {
        buttons.push({
            text: '<< Previous',
            callback_data: `admin_help_${currentPage - 1}`
        });
    }

    if (currentPage < totalPages) {
        buttons.push({
            text: 'Next >>',
            callback_data: `admin_help_${currentPage + 1}`
        });
    }

    return {
        reply_markup: {
            inline_keyboard: [buttons]
        }
    };
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

// Helper function to calculate time difference
function getTimeDifference(startDate, endDate) {
    const diff = Math.abs(endDate - startDate);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
} 