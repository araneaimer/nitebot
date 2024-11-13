import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { EventEmitter } from 'events';

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
        if (!fs.existsSync(STORAGE_PATH)) {
            fs.writeFileSync(STORAGE_PATH, JSON.stringify({}), 'utf8');
        } else {
            const data = fs.readFileSync(STORAGE_PATH, 'utf8');
            if (data.trim()) {
                const parsedData = JSON.parse(data);
                subscriptionsMap = new Map(Object.entries(parsedData));
            }
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
        fs.writeFileSync(STORAGE_PATH, JSON.stringify({}), 'utf8');
    }
}

// Initialize storage on module load
initializeStorage();

const subscriptionEmitter = new EventEmitter();

export const storageService = {
    loadSubscriptions() {
        try {
            const data = fs.readFileSync(STORAGE_PATH, 'utf8');
            if (!data.trim()) {
                return new Map();
            }
            const parsedData = JSON.parse(data);
            subscriptionsMap = new Map(Object.entries(parsedData));
            return subscriptionsMap;
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            return new Map();
        }
    },

    saveSubscriptions(subscriptions) {
        try {
            const data = JSON.stringify(Object.fromEntries(subscriptions), null, 2);
            fs.writeFileSync(STORAGE_PATH, data, 'utf8');
            subscriptionsMap = new Map(subscriptions);
        } catch (error) {
            console.error('Error saving subscriptions:', error);
        }
    },

    updateSubscription(chatId, subscriptionData) {
        subscriptionsMap.set(chatId.toString(), subscriptionData);
        this.saveSubscriptions(subscriptionsMap);
        subscriptionEmitter.emit('subscriptionChange', chatId, subscriptionData);
    },

    removeSubscription(chatId) {
        if (subscriptionsMap.has(chatId.toString())) {
            subscriptionsMap.delete(chatId.toString());
            this.saveSubscriptions(subscriptionsMap);
            subscriptionEmitter.emit('subscriptionChange', chatId, null);
        }
    },

    getSubscriptions() {
        return subscriptionsMap;
    },

    onSubscriptionChange(callback) {
        subscriptionEmitter.on('subscriptionChange', callback);
    }
}; 