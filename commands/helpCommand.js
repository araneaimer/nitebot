export function setupHelpCommand(bot) {
    // Define help message constant
    const HELP_MESSAGE = `Hi, My name is Nite
I am a versatile personal assistant bot currently under development.`;

    const HELP_KEYBOARD = {
        inline_keyboard: [
            [
                { text: 'Commands', callback_data: 'help_commands' },
                { text: 'About', callback_data: 'help_about' }
            ]
        ]
    };

    // Handle /help or /? command
    bot.onText(/\/(help|\?)/, (msg) => {
        const chatId = msg.chat.id;
        
        bot.sendMessage(chatId, HELP_MESSAGE, {
            parse_mode: 'Markdown',
            reply_markup: HELP_KEYBOARD
        });
    });

    // Handle callback queries
    bot.on('callback_query', (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;

        switch (query.data) {
            case 'help_commands':
                const commandsList = `*Available Commands:*\n\n/time, /tm, /t (timezone) - Display real-time chronological data\n/imagine, /image, /im, /i (prompt) - Generate images using AI\n/currency, /cr (currency conversion) - Real-time currency conversions\n/remind, /rm - Set message reminders`;
                bot.editMessageText(commandsList, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '<< Back', callback_data: 'help_main' }
                        ]]
                    }
                });
                break;

            case 'help_about':
                const aboutText = `*Nite v1.1*\nA versatile Telegram bot.\nDeveloper: @lordaimer`;
                bot.editMessageText(aboutText, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '<< Back', callback_data: 'help_main' }
                        ]]
                    }
                });
                break;

            case 'help_main':
                bot.editMessageText(HELP_MESSAGE, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown',
                    reply_markup: HELP_KEYBOARD
                });
                break;
        }
    });
}