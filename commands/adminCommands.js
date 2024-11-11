const userSet = new Set(); // Stores unique user IDs

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

    // Command to broadcast message to all users
    bot.onText(/\/broadcast (.+)/, async (msg, match) => {
        if (!isAdmin(msg)) {
            return bot.sendMessage(msg.chat.id, "⛔ This command is only available for administrators.");
        }

        const broadcastMessage = match[1];
        try {
            // Implement your broadcast logic here
            // You'll need to maintain a list of chat IDs to broadcast to
            await bot.sendMessage(msg.chat.id, `✅ Broadcast message sent:\n${broadcastMessage}`);
        } catch (error) {
            console.error('Broadcast command error:', error);
            await bot.sendMessage(msg.chat.id, "❌ Error sending broadcast message.");
        }
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
}; 