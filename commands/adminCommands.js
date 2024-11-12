let maintenanceMode = false;
let maintenanceStartTime = null;
const userSet = new Set();

// Track active chat IDs (you might want to persist this in a database later)
const activeChatIds = new Set();

let notifyEnabled = false;
const MONITORED_CHAT_ID = '5245253271';

const commandUsageStats = new Map(); // Tracks command usage frequency
let lastUserCommand = null; // Stores the last command from monitored user

const adminCommands = [
    {
        command: '/stats',
        description: 'Shows detailed system and bot statistics including memory usage, uptime, users, and maintenance status',
        usage: 'Just type /stats',
        example: '/stats'
    },
    {
        command: '/broadcast',
        description: 'Sends a message to all bot users. Use flags for different options',
        usage: '/broadcast [-p|-prw|-i|-info] <message>',
        example: '/broadcast Hello everyone!\n/broadcast -p Important update!\n/broadcast -info'
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
        command: '/notify',
        description: 'Toggle notifications for specific user activity',
        usage: '/notify [on|off]',
        example: '/notify on\n/notify off\n/notify'
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
    const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

    // Middleware to check if user is admin
    const isAdmin = (msg) => {
        const userId = msg.from.id.toString();
        return userId === ADMIN_USER_ID;
    };

    // Helper function for non-admin handling
    const handleNonAdmin = async (bot, msg) => {
        if (!isAdmin(msg)) {
            try {
                await bot.answerCallbackQuery(msg.id, {
                    text: "⛔ This command requires administrator privileges",
                    show_alert: false,
                    cache_time: 3
                });
            } catch (error) {
                const tempMessage = await bot.sendMessage(msg.chat.id, 
                    "⛔ This command requires administrator privileges");
                
                setTimeout(async () => {
                    try {
                        await bot.deleteMessage(msg.chat.id, tempMessage.message_id);
                    } catch (error) {
                        console.error('Error deleting temporary message:', error);
                    }
                }, 3000);
            }
            return true;
        }
        return false;
    };

    // Move all command handlers inside setupAdminCommands
    bot.onText(/\/maintenance(?:\s+(.+))?/, async (msg, match) => {
        if (await handleNonAdmin(bot, msg)) return;

        const action = match[1]?.toLowerCase();

        try {
            // If no action provided, show status
            if (!action) {
                const status = maintenanceMode
                    ? `🛠 *Maintenance Mode is ACTIVE*\n\nStarted: ${maintenanceStartTime.toLocaleString()}\nDuration: ${getTimeDifference(maintenanceStartTime, new Date())}`
                    : "✅ *Maintenance Mode is OFF*\n\nBot is operating normally";
                await bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
                return;
            }

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

    bot.onText(/\/stats/, async (msg) => {
        if (await handleNonAdmin(bot, msg)) return;
        
        try {
            // Send initial stats page
            const message = await generateStatsMessage(1);
            await bot.sendMessage(
                msg.chat.id,
                message,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: 'System Info', callback_data: 'stats_1' },
                            { text: 'Bot Stats', callback_data: 'stats_2' }
                        ]]
                    }
                }
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

    // Clear stats command (admin only)
    bot.onText(/\/clearstats/, async (msg) => {
        if (await handleNonAdmin(bot, msg)) return;

        try {
            userSet.clear();
            await bot.sendMessage(msg.chat.id, "✅ Statistics have been cleared.");
        } catch (error) {
            console.error('Clear stats error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error clearing statistics.");
        }
    });

    // Broadcast command with status reporting
    bot.onText(/\/broadcast(?:\s+(-[a-zA-Z]+))?\s*(.*)/, async (msg, match) => {
        if (await handleNonAdmin(bot, msg)) return;

        const flag = match[1]?.toLowerCase() || '';
        const message = match[2]?.trim();

        try {
            // Handle broadcast info flag
            if (flag === '-i' || flag === '-info') {
                await bot.sendMessage(
                    msg.chat.id,
                    `📊 *Broadcast Information*\n\n` +
                    `Total potential recipients: ${activeChatIds.size}\n\n` +
                    `Use \`/broadcast -p <message>\` to preview\n` +
                    `Use \`/broadcast <message>\` to send to all users`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Handle preview flag
            if (flag === '-p' || flag === '-prw') {
                if (!message) {
                    return bot.sendMessage(msg.chat.id, 
                        "❌ Please provide a message to preview.\n" +
                        "Example: `/broadcast -p Hello everyone!`",
                        { parse_mode: 'Markdown' }
                    );
                }
                await bot.sendMessage(
                    msg.chat.id,
                    `📢 *Preview of Broadcast Message*\n\n${message}`,
                    { parse_mode: 'Markdown' }
                );
                return;
            }

            // Handle actual broadcast
            if (!message) {
                return bot.sendMessage(msg.chat.id, 
                    "❌ Please provide a message to broadcast.\n" +
                    "Example: `/broadcast Hello everyone!`\n\n" +
                    "Available flags:\n" +
                    "• `-p` or `-prw`: Preview message\n" +
                    "• `-i` or `-info`: Show broadcast information",
                    { parse_mode: 'Markdown' }
                );
            }

            // Original broadcast logic
            const successfulSends = [];
            const failedSends = [];

            // Send initial status message
            const statusMsg = await bot.sendMessage(
                msg.chat.id,
                "🚀 Starting broadcast...\n\nMessage:\n" + message
            );

            // Broadcast to all active chats
            for (const chatId of activeChatIds) {
                try {
                    await bot.sendMessage(chatId, 
                        `📢 *Broadcast Message*\n\n${message}`, 
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
                `📝 Message:\n${message}`,
                {
                    chat_id: statusMsg.chat.id,
                    message_id: statusMsg.message_id,
                    parse_mode: 'Markdown'
                }
            );

        } catch (error) {
            console.error('Broadcast command error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error broadcasting message.");
        }
    });

    // Admin help command
    bot.onText(/\/admin/, async (msg) => {
        if (await handleNonAdmin(bot, msg)) return;

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

    // Handle callback queries for admin actions only
    bot.on('callback_query', async (query) => {
        if (query.data.startsWith('admin_help_') || 
            query.data.startsWith('notify_') || 
            query.data.startsWith('stats_')) {
            
            if (!isAdmin({ from: query.from })) {
                return; // Silently ignore non-admin attempts
            }
            
            try {
                if (query.data.startsWith('notify_')) {
                    const action = query.data.split('_')[1];
                    switch (action) {
                        case 'on':
                            notifyEnabled = true;
                            await bot.editMessageText(
                                `🔔 *Notification Settings*\n\n` +
                                `✅ Notifications have been *ENABLED*\n\n` +
                                `You will now receive notifications for user activity.`,
                                {
                                    chat_id: query.message.chat.id,
                                    message_id: query.message.message_id,
                                    parse_mode: 'Markdown'
                                }
                            );
                            break;
                        case 'off':
                            notifyEnabled = false;
                            await bot.editMessageText(
                                `🔔 *Notification Settings*\n\n` +
                                `❌ Notifications have been *DISABLED*\n\n` +
                                `You will no longer receive notifications for user activity.`,
                                {
                                    chat_id: query.message.chat.id,
                                    message_id: query.message.message_id,
                                    parse_mode: 'Markdown'
                                }
                            );
                            break;
                    }
                } else if (query.data.startsWith('admin_help_')) {
                    const page = parseInt(query.data.split('_')[2]);
                    // ... admin help pagination code ...
                } else if (query.data.startsWith('stats_')) {
                    const page = parseInt(query.data.split('_')[1]);
                    // ... stats pagination code ...
                }
                await bot.answerCallbackQuery(query.id); // Silent acknowledgment
            } catch (error) {
                console.error('Admin callback error:', error);
                await bot.answerCallbackQuery(query.id); // Still silent
            }
        }
    });

    bot.onText(/\/ping/, async (msg) => {
        if (await handleNonAdmin(bot, msg)) return;
        
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
        if (await handleNonAdmin(bot, msg)) return;
        
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

    bot.onText(/\/notify(?:\s+(\w+))?/, async (msg, match) => {
        if (await handleNonAdmin(bot, msg)) return;

        try {
            const action = match[1]?.toLowerCase();
            const userInfo = await bot.getChat(MONITORED_CHAT_ID);

            // Handle toggle actions from parameters
            if (action) {
                switch (action) {
                    case 'on':
                        notifyEnabled = true;
                        await bot.sendMessage(msg.chat.id, 
                            `✅ Notifications have been *ENABLED*\n\n` +
                            `You will now receive notifications for user activity.`,
                            { parse_mode: 'Markdown' }
                        );
                        return;

                    case 'off':
                        notifyEnabled = false;
                        await bot.sendMessage(msg.chat.id, 
                            `❌ Notifications have been *DISABLED*\n\n` +
                            `You will no longer receive notifications for user activity.`,
                            { parse_mode: 'Markdown' }
                        );
                        return;

                    default:
                        await bot.sendMessage(msg.chat.id,
                            `❌ Invalid parameter.\n\n` +
                            `Usage:\n` +
                            `• \`/notify on\` - Enable notifications\n` +
                            `• \`/notify off\` - Disable notifications\n` +
                            `• \`/notify\` - Check current status`,
                            { parse_mode: 'Markdown' }
                        );
                        return;
                }
            }

            // If no parameter, show status with inline buttons
            await bot.sendMessage(msg.chat.id,
                `🔔 *Notification Settings*\n\n` +
                `👤 *Monitored User:*\n` +
                `• Name: ${userInfo.first_name}${userInfo.last_name ? ' ' + userInfo.last_name : ''}\n` +
                `• Username: ${userInfo.username ? '@' + userInfo.username : 'N/A'}\n` +
                `• Chat ID: \`${MONITORED_CHAT_ID}\`\n` +
                `• Bio: ${userInfo.bio || 'N/A'}\n\n` +
                `Current Status: ${notifyEnabled ? '✅ ON' : '❌ OFF'}\n\n` +
                `Use \`/notify on\` to enable or \`/notify off\` to disable notifications.`,
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

        } catch (error) {
            console.error('Notify command error:', error);
            await bot.sendMessage(msg.chat.id, 
                "❌ Error managing notifications.");
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
        if (await handleNonAdmin(bot, msg)) return;

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

    // Pad with zeros for consistent format
    const paddedHours = hours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = seconds.toString().padStart(2, '0');

    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}

// Add this helper function
async function generateStatsMessage(page) {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    
    // Page 1: System Information
    if (page === 1) {
        return `🖥️ *System Information*\n\n` +
            `*Hardware:*\n` +
            `• Memory Usage: ${Math.round(memory.heapUsed / 1024 / 1024)}MB / ${Math.round(memory.heapTotal / 1024 / 1024)}MB\n` +
            `• RSS: ${Math.round(memory.rss / 1024 / 1024)}MB\n` +
            `• External: ${Math.round(memory.external / 1024 / 1024)}MB\n\n` +
            `*Runtime:*\n` +
            `• Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n` +
            `• Node Version: ${process.version}\n` +
            `• Platform: ${process.platform}\n\n` +
            `_Last Updated: ${new Date().toLocaleString()}_`;
    }
    
    // Page 2: Bot Statistics
    if (page === 2) {
        const maintenanceStatus = maintenanceMode
            ? `🛠 *MAINTENANCE MODE ACTIVE*\n` +
              `Started: ${maintenanceStartTime.toLocaleString()}\n` +
              `Duration: ${getTimeDifference(maintenanceStartTime, new Date())}\n\n`
            : '✅ Bot is operating normally\n\n';

        return `📊 *Bot Statistics*\n\n` +
            maintenanceStatus +
            `*Activity:*\n` +
            `• Total Users: ${userSet.size}\n` +
            `• Active Chats: ${activeChatIds.size}\n\n` +
            `*Status:*\n` +
            `• Maintenance: ${maintenanceMode ? 'ON 🛠' : 'OFF ✅'}\n` +
            `• Notifications: ${notifyEnabled ? 'ON 🔔' : 'OFF 🔕'}\n\n` +
            `_Last Updated: ${new Date().toLocaleString()}_`;
    }
}