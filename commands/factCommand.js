const FACT_CATEGORIES = ['history', 'science', 'geography', 'technology', 'random'];
const API_KEY = 'YOUR_API_NINJAS_KEY';

async function fetchRandomFact(category = 'random') {
    try {
        // Try API Ninjas first
        if (category !== 'random') {
            const ninjasResponse = await fetch(`https://api.api-ninjas.com/v1/facts?category=${category}`, {
                headers: {
                    'X-Api-Key': API_KEY
                }
            });
            
            if (ninjasResponse.ok) {
                const data = await ninjasResponse.json();
                if (data[0]?.fact) return data[0].fact;
            }
        }

        // Fallback to useless facts API if API Ninjas fails or category is random
        const fallbackResponse = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
        const fallbackData = await fallbackResponse.json();
        return fallbackData.text;
    } catch (error) {
        console.error('Error fetching fact:', error);
        return 'Sorry, I couldn\'t fetch a fact right now. Please try again later.';
    }
}

function createCategoryKeyboard() {
    const keyboard = [];
    const buttonsPerRow = 3;
    
    for (let i = 0; i < FACT_CATEGORIES.length; i += buttonsPerRow) {
        const row = FACT_CATEGORIES.slice(i, i + buttonsPerRow).map(category => ({
            text: category.charAt(0).toUpperCase() + category.slice(1),
            callback_data: `fact_${category}`
        }));
        keyboard.push(row);
    }
    
    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

export function setupFactCommand(bot) {
    // Handle /fact, /ft, and /facts commands
    bot.onText(/\/(fact|ft|facts)(?:@\w+)?(?:\s+(\w+))?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const category = match[2]?.toLowerCase();
        
        if (!category) {
            // If no category provided, show category selection keyboard
            bot.sendMessage(
                chatId, 
                'Please select a category:', 
                createCategoryKeyboard()
            );
            return;
        }
        
        try {
            // Validate category if provided
            if (!FACT_CATEGORIES.includes(category)) {
                const categoryList = FACT_CATEGORIES.join(', ');
                bot.sendMessage(chatId, 
                    `Invalid category. Available categories are: ${categoryList}`);
                return;
            }
            
            bot.sendChatAction(chatId, 'typing');
            const fact = await fetchRandomFact(category);
            bot.sendMessage(chatId, fact);
        } catch (error) {
            console.error('Error in fact command:', error);
            bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again later.');
        }
    });

    // Handle callback queries from inline keyboard
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;

        if (data.startsWith('fact_')) {
            const category = data.replace('fact_', '');
            
            try {
                bot.sendChatAction(chatId, 'typing');
                const fact = await fetchRandomFact(category);
                
                // Edit the original message with the fact
                await bot.editMessageText(fact, {
                    chat_id: chatId,
                    message_id: messageId
                });
            } catch (error) {
                console.error('Error in fact callback:', error);
                bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again later.');
            }
        }
    });
} 