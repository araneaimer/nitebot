import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

// Initialize environment variables
dotenv.config();

// Initialize bot http token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Define help message constant at the top level
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

// Add these comprehensive mappings at the top level of your file
const TIMEZONE_MAPPINGS = {
    // Countries and their primary timezones
    'afghanistan': 'Asia/Kabul',
    'albania': 'Europe/Tirane',
    'algeria': 'Africa/Algiers',
    'argentina': 'America/Argentina/Buenos_Aires',
    'australia': 'Australia/Sydney',
    'austria': 'Europe/Vienna',
    'azerbaijan': 'Asia/Baku',
    'bahrain': 'Asia/Bahrain',
    'bangladesh': 'Asia/Dhaka',
    'belgium': 'Europe/Brussels',
    'brazil': 'America/Sao_Paulo',
    'canada': 'America/Toronto',
    'chile': 'America/Santiago',
    'china': 'Asia/Shanghai',
    'colombia': 'America/Bogota',
    'czech': 'Europe/Prague',
    'denmark': 'Europe/Copenhagen',
    'egypt': 'Africa/Cairo',
    'finland': 'Europe/Helsinki',
    'france': 'Europe/Paris',
    'germany': 'Europe/Berlin',
    'greece': 'Europe/Athens',
    'hong kong': 'Asia/Hong_Kong',
    'hungary': 'Europe/Budapest',
    'iceland': 'Atlantic/Reykjavik',
    'india': 'Asia/Kolkata',
    'indonesia': 'Asia/Jakarta',
    'iran': 'Asia/Tehran',
    'iraq': 'Asia/Baghdad',
    'ireland': 'Europe/Dublin',
    'israel': 'Asia/Jerusalem',
    'italy': 'Europe/Rome',
    'japan': 'Asia/Tokyo',
    'kazakhstan': 'Asia/Almaty',
    'kenya': 'Africa/Nairobi',
    'kuwait': 'Asia/Kuwait',
    'malaysia': 'Asia/Kuala_Lumpur',
    'mexico': 'America/Mexico_City',
    'morocco': 'Africa/Casablanca',
    'nepal': 'Asia/Kathmandu',
    'netherlands': 'Europe/Amsterdam',
    'new zealand': 'Pacific/Auckland',
    'nigeria': 'Africa/Lagos',
    'norway': 'Europe/Oslo',
    'pakistan': 'Asia/Karachi',
    'philippines': 'Asia/Manila',
    'poland': 'Europe/Warsaw',
    'portugal': 'Europe/Lisbon',
    'qatar': 'Asia/Qatar',
    'romania': 'Europe/Bucharest',
    'russia': 'Europe/Moscow',
    'saudi': 'Asia/Riyadh',
    'singapore': 'Asia/Singapore',
    'south africa': 'Africa/Johannesburg',
    'south korea': 'Asia/Seoul',
    'spain': 'Europe/Madrid',
    'sweden': 'Europe/Stockholm',
    'switzerland': 'Europe/Zurich',
    'taiwan': 'Asia/Taipei',
    'thailand': 'Asia/Bangkok',
    'turkey': 'Europe/Istanbul',
    'ukraine': 'Europe/Kiev',
    'united arab emirates': 'Asia/Dubai',
    'united kingdom': 'Europe/London',
    'united states': 'America/New_York',
    'vietnam': 'Asia/Ho_Chi_Minh',
    // Common alternative names
    'uk': 'Europe/London',
    'usa': 'America/New_York',
    'uae': 'Asia/Dubai',
    'korea': 'Asia/Seoul',
    // Major cities
    'abu dhabi': 'Asia/Dubai',
    'amsterdam': 'Europe/Amsterdam',
    'athens': 'Europe/Athens',
    'bangkok': 'Asia/Bangkok',
    'barcelona': 'Europe/Madrid',
    'beijing': 'Asia/Shanghai',
    'berlin': 'Europe/Berlin',
    'brussels': 'Europe/Brussels',
    'cairo': 'Africa/Cairo',
    'chicago': 'America/Chicago',
    'dallas': 'America/Chicago',
    'delhi': 'Asia/Kolkata',
    'denver': 'America/Denver',
    'dubai': 'Asia/Dubai',
    'dublin': 'Europe/Dublin',
    'frankfurt': 'Europe/Berlin',
    'helsinki': 'Europe/Helsinki',
    'hong kong': 'Asia/Hong_Kong',
    'istanbul': 'Europe/Istanbul',
    'jakarta': 'Asia/Jakarta',
    'jerusalem': 'Asia/Jerusalem',
    'johannesburg': 'Africa/Johannesburg',
    'kuala lumpur': 'Asia/Kuala_Lumpur',
    'lisbon': 'Europe/Lisbon',
    'london': 'Europe/London',
    'los angeles': 'America/Los_Angeles',
    'madrid': 'Europe/Madrid',
    'manila': 'Asia/Manila',
    'melbourne': 'Australia/Melbourne',
    'mexico city': 'America/Mexico_City',
    'miami': 'America/New_York',
    'milan': 'Europe/Rome',
    'moscow': 'Europe/Moscow',
    'mumbai': 'Asia/Kolkata',
    'munich': 'Europe/Berlin',
    'new delhi': 'Asia/Kolkata',
    'new york': 'America/New_York',
    'oslo': 'Europe/Oslo',
    'paris': 'Europe/Paris',
    'prague': 'Europe/Prague',
    'rome': 'Europe/Rome',
    'san francisco': 'America/Los_Angeles',
    'sao paulo': 'America/Sao_Paulo',
    'seattle': 'America/Los_Angeles',
    'seoul': 'Asia/Seoul',
    'shanghai': 'Asia/Shanghai',
    'singapore': 'Asia/Singapore',
    'stockholm': 'Europe/Stockholm',
    'sydney': 'Australia/Sydney',
    'taipei': 'Asia/Taipei',
    'tokyo': 'Asia/Tokyo',
    'toronto': 'America/Toronto',
    'vancouver': 'America/Vancouver',
    'vienna': 'Europe/Vienna',
    'warsaw': 'Europe/Warsaw',
    'washington': 'America/New_York',
    'zurich': 'Europe/Zurich'
};

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;
    
    // Get current hour in user's timezone
    const hour = new Date().getHours();
    
    // Determine greeting based on time of day
    let greeting;
    if (hour >= 5 && hour < 12) {
        greeting = `Good Morning ${firstName}! 🌅`;
    } else if (hour >= 12 && hour < 17) {
        greeting = `Good Afternoon ${firstName}! ☀️`;
    } else if (hour >= 17 && hour < 22) {
        greeting = `Good Evening ${firstName}! 🌆`;
    } else {
        greeting = `Good Night ${firstName}! 🌙`;
    }

    bot.sendMessage(chatId, greeting);
});

// Handle /help or /? command
bot.onText(/\/(help|\?)/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, HELP_MESSAGE, {
        parse_mode: 'Markdown',
        reply_markup: HELP_KEYBOARD
    });
});

// Handle callback queries from inline keyboard
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    switch (query.data) {
        case 'help_commands':
            const commandsList = `*Available Commands:*

/time, /tm, /t (timezone) - Display real-time chronological data
/imagine, /image, /im, /i (prompt) - Generate images using AI
/currency, /cr (currency conversion) - Real-time currency conversions
/remind, /rm - Set message reminders`;

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
            const aboutText = `*About Nite Bot*
A versatile Telegram bot.
Version: 1.0
Developer: @lordaimer`;

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

// Handle time commands
bot.onText(/\/(time|tm|t)(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const location = match[2]?.trim();

    if (!location) {
        return bot.sendMessage(chatId, 
            "Please provide a city or country name.\nExample: `/time Paris` or `/t Japan`", 
            { parse_mode: 'Markdown' }
        );
    }

    try {
        const locationLower = location.toLowerCase();
        let matchedZone;

        // First check direct matches in our mapping
        if (TIMEZONE_MAPPINGS[locationLower]) {
            matchedZone = TIMEZONE_MAPPINGS[locationLower];
        } else {
            // Check partial matches in our mapping
            const partialMatch = Object.entries(TIMEZONE_MAPPINGS).find(([key]) => 
                key.includes(locationLower) || locationLower.includes(key)
            );
            if (partialMatch) {
                matchedZone = partialMatch[1];
            } else {
                // Try to find in moment-timezone database as a last resort
                matchedZone = moment.tz.names().find(zone => {
                    const zoneParts = zone.toLowerCase().split('/');
                    const locationParts = locationLower.split(' ');
                    
                    return locationParts.some(part => 
                        zoneParts.some(zonePart => 
                            zonePart.includes(part.replace(/[^a-z]/g, ''))
                        )
                    );
                });
            }
        }

        if (!matchedZone) {
            return bot.sendMessage(chatId, 
                "Sorry, I couldn't find that location. Please try another city or country name.",
                { parse_mode: 'Markdown' }
            );
        }

        // Send initial time
        const sentMsg = await bot.sendMessage(chatId, 
            formatTimeMessage(matchedZone), 
            { parse_mode: 'Markdown' }
        );

        // Update time every second for 5 minutes (300 seconds)
        let updates = 0;
        const intervalId = setInterval(() => {
            updates++;
            if (updates >= 300) {
                clearInterval(intervalId);
                return;
            }

            bot.editMessageText(
                formatTimeMessage(matchedZone),
                {
                    chat_id: chatId,
                    message_id: sentMsg.message_id,
                    parse_mode: 'Markdown'
                }
            ).catch(error => {
                clearInterval(intervalId);
                console.error('Error updating time:', error);
            });
        }, 1000);
    } catch (error) {
        console.error('Time command error:', error);
        bot.sendMessage(chatId, 
            "Sorry, there was an error processing your request. Please try again.",
            { parse_mode: 'Markdown' }
        );
    }
});

// Add this helper function to format the time message
function formatTimeMessage(timezone) {
    const time = moment().tz(timezone);
    const locationName = timezone.split('/').pop().replace(/_/g, ' ');
    
    return `*${locationName}: ${time.format('HH:mm:ss')}*\n*${time.format('MMMM DD YYYY')}*`;
}
