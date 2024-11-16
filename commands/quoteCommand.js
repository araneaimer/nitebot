async function fetchQuote() {
    try {
        const response = await fetch('https://api.quotable.io/random?tags=inspirational|motivation|wisdom');
        const data = await response.json();
        
        if (!data.content || !data.author) {
            throw new Error('Invalid quote data received');
        }
        
        return {
            text: data.content,
            author: data.author
        };
    } catch (error) {
        console.error('Error fetching quote:', error);
        return {
            text: 'The only way to do great work is to love what you do.',
            author: 'Steve Jobs'
        };
    }
}

export function setupQuoteCommand(bot) {
    bot.onText(/\/(quote|qt)/, async (msg) => {
        const chatId = msg.chat.id;
        
        try {
            await bot.sendChatAction(chatId, 'typing');
            
            const quote = await fetchQuote();
            const formattedQuote = `${quote.text}\n— ${quote.author}`;
            
            await bot.sendMessage(chatId, formattedQuote, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Another Quote', callback_data: 'quote_another' }
                    ]]
                }
            });
        } catch (error) {
            console.error('Error in quote command:', error);
            await bot.sendMessage(chatId, '❌ Failed to fetch a quote. Please try again.');
        }
    });

    // Handle callback query for "Another Quote" button
    bot.on('callback_query', async (query) => {
        if (query.data === 'quote_another') {
            const chatId = query.message.chat.id;
            const messageId = query.message.message_id;

            try {
                const quote = await fetchQuote();
                const formattedQuote = `${quote.text}\n— ${quote.author}`;

                await bot.editMessageText(formattedQuote, {
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🔄 Another Quote', callback_data: 'quote_another' }
                        ]]
                    }
                });
            } catch (error) {
                console.error('Error in quote callback:', error);
                await bot.answerCallbackQuery(query.id, {
                    text: '❌ Failed to fetch a new quote. Please try again.',
                    show_alert: true
                });
            }
        }
    });
} 