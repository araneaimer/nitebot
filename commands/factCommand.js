import fetch from 'node-fetch';

const categories = [
    { text: '🎲 Random', callback_data: 'fact_random' },
    { text: '🧪 Science', callback_data: 'fact_science' },
    { text: '🐾 Animals', callback_data: 'fact_animals' },
    { text: '⌛ History', callback_data: 'fact_history' },
    { text: '🎭 Art', callback_data: 'fact_art' },
    { text: '🌏 Culture', callback_data: 'fact_culture' }
];

async function getFact(category = '') {
    // Try Ninja API first
    const apiKey = process.env.NINJA_API_KEY;
    const ninjaUrl = `https://api.api-ninjas.com/v1/facts${category ? `?category=${category}` : ''}`;
    console.log('Trying Ninja API URL:', ninjaUrl);
    
    try {
        const response = await fetch(ninjaUrl, {
            headers: {
                'X-Api-Key': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Invalid data format received');
        }

        return data[0].fact;
    } catch (error) {
        console.error('Error fetching from Ninja API:', error);
        
        // Fallback to useless facts API
        console.log('Trying fallback API...');
        try {
            const fallbackUrl = 'https://uselessfacts.jsph.pl/api/v2/facts/random';
            const fallbackResponse = await fetch(fallbackUrl);
            
            if (!fallbackResponse.ok) {
                throw new Error(`Fallback API responded with status ${fallbackResponse.status}`);
            }

            const fallbackData = await fallbackResponse.json();
            return fallbackData.text;
        } catch (fallbackError) {
            console.error('Error fetching from fallback API:', fallbackError);
            return 'Sorry, couldn\'t fetch a fact right now. Please try again later.';
        }
    }
}

function getCategoryKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                categories.slice(0, 2),
                categories.slice(2, 4),
                categories.slice(4, 6)
            ]
        }
    };
}

function getFactKeyboard(category) {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔄 Another Fact', callback_data: `fact_${category}` },
                    { text: '📚 Change Category', callback_data: 'fact_categories' }
                ]
            ]
        }
    };
}

export function setupFactCommand(bot) {
    // Handle /fact, /facts, and /ft commands
    const commandRegex = /^\/(?:fact|facts|ft)$/;
    bot.onText(commandRegex, async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(
            chatId,
            'Choose a category for your fact:',
            getCategoryKeyboard()
        );
    });

    // Handle callback queries
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        if (!data.startsWith('fact_')) return;

        const category = data.replace('fact_', '');

        if (category === 'categories') {
            await bot.editMessageText(
                'Choose a category for your fact:',
                {
                    chat_id: chatId,
                    message_id: messageId,
                    ...getCategoryKeyboard()
                }
            );
            return;
        }

        const fact = await getFact(category === 'random' ? '' : category);
        await bot.editMessageText(
            fact,
            {
                chat_id: chatId,
                message_id: messageId,
                ...getFactKeyboard(category)
            }
        );
    });
}