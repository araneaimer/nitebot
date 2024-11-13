import moment from 'moment-timezone';
import { storageService } from './storageService.js';
import { getFact } from '../commands/factCommand.js';
import { fetchJoke } from '../commands/jokeCommand.js';
import { getMemeFromReddit } from '../commands/memeCommand.js';

const scheduledTasks = new Map();
let botInstance;

async function fetchContent(type) {
    try {
        switch (type) {
            case 'fact':
                const { fact } = await getFact('random');
                return fact;
            case 'joke':
                return await fetchJoke();
            case 'meme':
                const meme = await getMemeFromReddit();
                return { type: 'meme', ...meme };
            default:
                throw new Error('Invalid content type');
        }
    } catch (error) {
        console.error(`Error fetching ${type}:`, error);
        return null;
    }
}

function scheduleNextOccurrence(chatId, contentType, time, timezone) {
    const now = moment().tz(timezone);
    const [hours, minutes] = time.split(':');
    let scheduledTime = moment().tz(timezone).set({ hours, minutes, seconds: 0 });
    
    if (scheduledTime.isBefore(now)) {
        scheduledTime = scheduledTime.add(1, 'day');
    }

    const msUntilScheduled = scheduledTime.diff(now);
    const taskKey = `${chatId}_${contentType}_${time}`;
    
    if (scheduledTasks.has(taskKey)) {
        clearTimeout(scheduledTasks.get(taskKey));
    }

    const task = setTimeout(async () => {
        try {
            const content = await fetchContent(contentType);
            if (!content) return;

            const escapeMarkdown = (text) => text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
            const subscriptionMessage = `||${contentType.charAt(0).toUpperCase() + contentType.slice(1)} from your daily ${contentType} subscription||`;

            if (typeof content === 'object' && content.type === 'meme') {
                const caption = [
                    escapeMarkdown(content.title),
                    '',
                    `💻 u/${escapeMarkdown(content.author)}`,
                    `⌨️ r/${escapeMarkdown(content.subreddit)}`,
                    '',
                    subscriptionMessage
                ].join('\n');

                await botInstance.sendPhoto(chatId, content.url, {
                    caption: caption,
                    parse_mode: 'MarkdownV2',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🎲 Another random meme', callback_data: 'meme_random' }
                        ]]
                    }
                });
            } else {
                const messageText = escapeMarkdown(content) + '\n\n' + subscriptionMessage;
                
                await botInstance.sendMessage(chatId, messageText, {
                    parse_mode: 'MarkdownV2',
                    reply_markup: contentType === 'fact' ? {
                        inline_keyboard: [[
                            { text: '🔄 Another Fact', callback_data: 'fact_random' },
                            { text: '📚 Change Category', callback_data: 'fact_categories' }
                        ]]
                    } : {
                        inline_keyboard: [[
                            { text: '🔄 Another Joke', callback_data: 'joke_another' }
                        ]]
                    }
                });
            }
        } catch (error) {
            console.error(`Error sending scheduled content:`, error);
        } finally {
            scheduleNextOccurrence(chatId, contentType, time, timezone);
        }
    }, msUntilScheduled);

    scheduledTasks.set(taskKey, task);
}

export function setupScheduler(bot) {
    botInstance = bot;
    
    const subscriptions = storageService.getSubscriptions();
    
    for (const [chatId, userSubs] of subscriptions.entries()) {
        for (const [contentType, subData] of Object.entries(userSubs)) {
            const { times, timezone } = subData;
            times.forEach(time => {
                scheduleNextOccurrence(chatId, contentType, time, timezone);
            });
        }
    }

    storageService.onSubscriptionChange((chatId, subscriptionData) => {
        for (const taskKey of scheduledTasks.keys()) {
            if (taskKey.startsWith(chatId)) {
                clearTimeout(scheduledTasks.get(taskKey));
                scheduledTasks.delete(taskKey);
            }
        }

        if (subscriptionData) {
            for (const [contentType, subData] of Object.entries(subscriptionData)) {
                const { times, timezone } = subData;
                times.forEach(time => {
                    scheduleNextOccurrence(chatId, contentType, time, timezone);
                });
            }
        }
    });
}