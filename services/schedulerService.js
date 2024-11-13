import moment from 'moment-timezone';
import { storageService } from './storageService.js';
import { getFact } from '../commands/factCommand.js';
import { fetchJoke } from '../commands/jokeCommand.js';
import { getMemeFromReddit } from '../commands/memeCommand.js';

// Keep track of scheduled tasks
const scheduledTasks = new Map();

// Store bot instance
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
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime.isBefore(now)) {
        scheduledTime = scheduledTime.add(1, 'day');
    }

    const msUntilScheduled = scheduledTime.diff(now);
    console.log(`Scheduling ${contentType} for ${chatId} at ${scheduledTime.format('YYYY-MM-DD HH:mm:ss')} (${msUntilScheduled}ms from now)`);

    const taskKey = `${chatId}_${contentType}_${time}`;
    
    // Clear any existing scheduled task
    if (scheduledTasks.has(taskKey)) {
        clearTimeout(scheduledTasks.get(taskKey));
    }

    // Schedule new task
    const task = setTimeout(async () => {
        try {
            const content = await fetchContent(contentType);
            if (!content) return;

            // Helper function to escape special characters for MarkdownV2
            const escapeMarkdown = (text) => text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');

            if (typeof content === 'object' && content.type === 'meme') {
                const caption = [
                    escapeMarkdown(content.title),
                    '',
                    `💻 u/${escapeMarkdown(content.author)}`,
                    `⌨️ r/${escapeMarkdown(content.subreddit)}`,
                    '',
                    '||🔔 From your daily subscription||'
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
                const messageText = escapeMarkdown(content) + '\n\n||🔔 From your daily subscription||';
                
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
            // Schedule next occurrence
            scheduleNextOccurrence(chatId, contentType, time, timezone);
        }
    }, msUntilScheduled);

    scheduledTasks.set(taskKey, task);
}

export function setupScheduler(bot) {
    console.log('Setting up scheduler...');
    botInstance = bot; // Store bot instance
    
    // Initial scheduling of all subscriptions
    const subscriptions = storageService.getSubscriptions();
    
    for (const [chatId, userSubs] of subscriptions.entries()) {
        for (const [contentType, subData] of Object.entries(userSubs)) {
            const { times, timezone } = subData;
            // Schedule each time for this subscription
            times.forEach(time => {
                scheduleNextOccurrence(chatId, contentType, time, timezone);
            });
        }
    }

    // Listen for subscription changes
    storageService.onSubscriptionChange((chatId, subscriptionData) => {
        // Clear existing schedules for this chat
        for (const taskKey of scheduledTasks.keys()) {
            if (taskKey.startsWith(chatId)) {
                clearTimeout(scheduledTasks.get(taskKey));
                scheduledTasks.delete(taskKey);
            }
        }

        // Schedule new times
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