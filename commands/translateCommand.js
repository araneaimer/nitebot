import axios from 'axios';

// Track users in translation mode
const translateModeUsers = new Map();

// Lingva API endpoints with fallbacks
const LINGVA_INSTANCES = [
    'https://lingva.ml',
    'https://lingva.fossdaily.xyz',
    'https://translate.plausibility.cloud',
    'https://lingva.pussthecat.org'
].map(url => `${url}/api/v1`);

// Supported languages with their codes
const SUPPORTED_LANGUAGES = {
    'auto': 'Auto Detect',
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi'
};

async function translateWithFallback(text, targetLang, sourceLang = 'auto') {
    let lastError;
    
    // Try each instance until one works
    for (const apiUrl of LINGVA_INSTANCES) {
        try {
            const response = await axios.get(
                `${apiUrl}/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`,
                { timeout: 5000 } // 5 second timeout
            );
            
            return {
                translated: response.data.translation,
                detectedSourceLang: response.data.info?.detectedSource || sourceLang
            };
        } catch (error) {
            console.error(`Translation error with ${apiUrl}:`, error.message);
            lastError = error;
            continue; // Try next instance
        }
    }
    
    // If all instances failed
    throw lastError || new Error('All translation services failed');
}

// Helper function to create language selection keyboard
const getLanguageKeyboard = () => {
    const keyboard = [];
    const languages = Object.entries(SUPPORTED_LANGUAGES)
        .filter(([code]) => code !== 'auto'); // Remove auto-detect option
    
    // Create rows of 2 buttons each
    for (let i = 0; i < languages.length; i += 2) {
        const row = languages.slice(i, i + 2).map(([code, name]) => ({
            text: name,
            callback_data: `translate_${code}`
        }));
        keyboard.push(row);
    }

    // Add cancel button at the bottom
    keyboard.push([{ text: 'Cancel', callback_data: 'translate_cancel' }]);

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
};

// When showing help message, use this keyboard
const getQuickAccessKeyboard = () => ({
    reply_markup: {
        inline_keyboard: [
            [
                { text: 'English', callback_data: 'translate_en' },
                { text: 'German', callback_data: 'translate_de' }
            ],
            [
                { text: 'French', callback_data: 'translate_fr' },
                { text: 'Spanish', callback_data: 'translate_es' }
            ],
            [
                { text: 'Japanese', callback_data: 'translate_ja' },
                { text: 'Chinese', callback_data: 'translate_zh' }
            ],
            [
                { text: 'Show All Languages', callback_data: 'translate_more' }
            ]
        ]
    }
});

// When showing "Translate Another" button
const getTranslateAnotherKeyboard = () => ({
    reply_markup: {
        inline_keyboard: [[
            { text: 'Translate Another', callback_data: 'translate_start' }
        ]]
    }
});

// When language parameter is invalid or not provided, show quick language selection
const showQuickLanguageSelection = async (bot, chatId, text) => {
    const popularLanguages = [
        ['English', 'en'],
        ['Spanish', 'es'],
        ['Chinese', 'zh'],
        ['Japanese', 'ja'],
        ['Russian', 'ru'],
        ['German', 'de'],
        ['Italian', 'it'],
        ['Hindi', 'hi']
    ];

    // Store the text to translate
    translateModeUsers.set(chatId, { text });

    // Create keyboard with popular languages in 2 columns
    const keyboard = [];
    for (let i = 0; i < popularLanguages.length; i += 2) {
        const row = [];
        row.push({
            text: popularLanguages[i][0],
            callback_data: `translate_${popularLanguages[i][1]}`
        });
        if (i + 1 < popularLanguages.length) {
            row.push({
                text: popularLanguages[i + 1][0],
                callback_data: `translate_${popularLanguages[i + 1][1]}`
            });
        }
        keyboard.push(row);
    }

    // Add "More Languages" button at the bottom
    keyboard.push([{ 
        text: 'More Languages', 
        callback_data: 'translate_more' 
    }]);

    await bot.sendMessage(
        chatId,
        'Select target language:',
        {
            reply_markup: {
                inline_keyboard: keyboard
            }
        }
    );
};

const HELP_MESSAGE = `*Nite Live Translate*

I. Direct Translation:
/trans en Hello World, 
/trns English Bonjour le monde, 
/translate german こんにちは

II. Quick Translation:
/trans Hello World
Shows a list of popular languages to choose from.

Source language is automatically detected`;

export function setupTranslateCommand(bot) {
    // Handle /translate or /trns command
    bot.onText(/\/(translate|trns|trans)(?:\s+([a-zA-Z]+)\s+)?(.+)?/, async (msg, match) => {
        const chatId = msg.chat.id;
        const targetLangInput = match[2]?.trim().toLowerCase();
        const text = match[3]?.trim();

        // Help message if no parameters
        if (!targetLangInput && !text) {
            await bot.sendMessage(
                chatId,
                HELP_MESSAGE,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // If we have text but no language, show language selection
        if (!targetLangInput && text) {
            translateModeUsers.set(chatId, { text });
            await bot.sendMessage(
                chatId,
                '🎯 *Select target language:*\n\n' +
                `_Text to translate:_\n${text}`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: getLanguageKeyboard()
                }
            );
            return;
        }

        // Direct translation with language parameter
        if (targetLangInput && text) {
            // Find the language code from input
            const targetLang = Object.entries(SUPPORTED_LANGUAGES)
                .find(([code, name]) => 
                    code === targetLangInput || 
                    name.toLowerCase() === targetLangInput ||
                    code === targetLangInput.substring(0, 2)
                )?.[0];

            if (!targetLang || targetLang === 'auto') {
                await showQuickLanguageSelection(bot, chatId, text);
                return;
            }

            // Show translation in progress
            const statusMessage = await bot.sendMessage(
                chatId,
                '🔄 *Translating...*',
                { parse_mode: 'Markdown' }
            );

            try {
                const result = await translateWithFallback(text, targetLang);
                const sourceLangName = SUPPORTED_LANGUAGES[result.detectedSourceLang] || result.detectedSourceLang;
                const targetLangName = SUPPORTED_LANGUAGES[targetLang];

                await bot.editMessageText(
                    `🔤 *Original* (${sourceLangName}):\n${text}\n\n` +
                    `🌐 *Translation* (${targetLangName}):\n${result.translated}`,
                    {
                        chat_id: chatId,
                        message_id: statusMessage.message_id,
                        parse_mode: 'Markdown',
                        reply_markup: getTranslateAnotherKeyboard()
                    }
                );
            } catch (error) {
                console.error('Translation error:', error);
                await bot.editMessageText(
                    '❌ Sorry, translation failed. Please try again later.',
                    {
                        chat_id: chatId,
                        message_id: statusMessage.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            }
        }
    });

    // Handle callback queries
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (!data.startsWith('translate_')) return;

        const lang = data.replace('translate_', '');
        const session = translateModeUsers.get(chatId);

        if (!session) return;

        try {
            if (lang === 'cancel') {
                translateModeUsers.delete(chatId);
                await bot.editMessageText(
                    '❌ Translation cancelled.',
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id
                    }
                );
                return;
            }

            // Show translation in progress
            await bot.editMessageText(
                '🔄 *Translating...*',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown'
                }
            );

            const result = await translateWithFallback(session.text, lang);
            const sourceLangName = SUPPORTED_LANGUAGES[result.detectedSourceLang] || result.detectedSourceLang;
            const targetLangName = SUPPORTED_LANGUAGES[lang];

            await bot.editMessageText(
                `🔤 *Original* (${sourceLangName}):\n${session.text}\n\n` +
                `🌐 *Translation* (${targetLangName}):\n${result.translated}`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: getTranslateAnotherKeyboard()
                }
            );

            // Clear the session
            translateModeUsers.delete(chatId);

        } catch (error) {
            console.error('Translation error:', error);
            await bot.editMessageText(
                '❌ Sorry, translation failed. Please try again later.',
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown'
                }
            );
            translateModeUsers.delete(chatId);
        }
    });
} 