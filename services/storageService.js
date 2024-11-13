import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORAGE_PATH = path.join(__dirname, '../data/subscriptions.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Single instance of subscriptions Map
let subscriptionsMap = new Map();

// Initialize storage
function initializeStorage() {
    try {
        console.log('Initializing storage...');
        if (!fs.existsSync(STORAGE_PATH)) {
            console.log('Creating new storage file');
            fs.writeFileSync(STORAGE_PATH, JSON.stringify({}), 'utf8');
        } else {
            console.log('Loading existing storage file');
            const data = fs.readFileSync(STORAGE_PATH, 'utf8');
            if (data.trim()) {
                const parsedData = JSON.parse(data);
                subscriptionsMap = new Map(Object.entries(parsedData));
                console.log('Loaded subscriptions:', Object.fromEntries(subscriptionsMap));
            }
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
        fs.writeFileSync(STORAGE_PATH, JSON.stringify({}), 'utf8');
    }
}

// Initialize storage on module load
initializeStorage();

export const storageService = {
    loadSubscriptions() {
        try {
            console.log('Loading subscriptions from file');
            const data = fs.readFileSync(STORAGE_PATH, 'utf8');
            if (!data.trim()) {
                return new Map();
            }
            const parsedData = JSON.parse(data);
            subscriptionsMap = new Map(Object.entries(parsedData));
            console.log('Loaded subscriptions:', Object.fromEntries(subscriptionsMap));
            return subscriptionsMap;
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            return new Map();
        }
    },

    saveSubscriptions(subscriptions) {
        try {
            console.log('Saving subscriptions:', Object.fromEntries(subscriptions));
            const data = JSON.stringify(Object.fromEntries(subscriptions), null, 2);
            fs.writeFileSync(STORAGE_PATH, data, 'utf8');
            subscriptionsMap = new Map(subscriptions);
            console.log('Successfully saved subscriptions to file');
        } catch (error) {
            console.error('Error saving subscriptions:', error);
        }
    },

    updateSubscription(chatId, subscriptionData) {
        console.log(`Updating subscription for ${chatId}:`, subscriptionData);
        subscriptionsMap.set(chatId.toString(), subscriptionData);
        this.saveSubscriptions(subscriptionsMap);
        console.log('Current subscriptions after update:', Object.fromEntries(subscriptionsMap));
    },

    removeSubscription(chatId) {
        console.log(`Removing subscription for ${chatId}`);
        if (subscriptionsMap.has(chatId.toString())) {
            subscriptionsMap.delete(chatId.toString());
            this.saveSubscriptions(subscriptionsMap);
            console.log('Subscription removed successfully');
        }
    },

    getSubscriptions() {
        return subscriptionsMap;
    }
}; 