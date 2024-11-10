import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import moment from 'moment-timezone';

// Get current file's directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read and parse JSON file
const timezoneMappings = JSON.parse(
    readFileSync(join(__dirname, '../data/timezones.json'), 'utf8')
);

function formatTimeMessage(timezone) {
    const time = moment().tz(timezone);
    const locationName = timezone.split('/').pop().replace(/_/g, ' ');
    
    return `*${locationName}: ${time.format('HH:mm:ss')}*\n*${time.format('MMMM DD YYYY')}*`;
}

function findTimezone(location) {
    const locationLower = location.toLowerCase();

    // Direct match in our mapping
    if (timezoneMappings[locationLower]) {
        return timezoneMappings[locationLower];
    }

    // Partial match in our mapping
    const partialMatch = Object.entries(timezoneMappings).find(([key]) => 
        key.includes(locationLower) || locationLower.includes(key)
    );
    if (partialMatch) {
        return partialMatch[1];
    }

    // Last resort: search moment-timezone database
    return moment.tz.names().find(zone => {
        const zoneParts = zone.toLowerCase().split('/');
        const locationParts = locationLower.split(' ');
        
        return locationParts.some(part => 
            zoneParts.some(zonePart => 
                zonePart.includes(part.replace(/[^a-z]/g, ''))
            )
        );
    });
}

export function setupTimeCommand(bot) {
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
            const matchedZone = findTimezone(location);

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
}