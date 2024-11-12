import { GoogleGenerativeAI } from '@google/generative-ai';

class LLMService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        this.conversationHistory = new Map();
        this.requestCounts = new Map(); // Track requests per minute
        this.lastRequestTime = new Map(); // Track time between requests
    }

    async generateResponse(message, chatId) {
        try {
            // Rate limiting check
            if (!this.checkRateLimit(chatId)) {
                return "I'm processing too many requests right now. Please try again in a moment.";
            }

            // Input length check
            if (message.length > 30720) {
                return "Your message is too long. Please send a shorter message (max 30,720 characters).";
            }

            // Get conversation history
            const history = this.conversationHistory.get(chatId) || [];
            
            // Add new message to history
            history.push({ role: 'user', parts: [{ text: message }] });
            if (history.length > 10) {
                history.shift();
            }

            // Create chat context with correct format
            const chat = this.model.startChat({
                history: history.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : msg.role,
                    parts: msg.parts
                }))
            });

            // Send message with proper format
            const result = await chat.sendMessage([{ text: message }]);
            const response = result.response.text();

            // Add response to history with 'model' role
            history.push({ role: 'model', parts: [{ text: response }] });
            this.conversationHistory.set(chatId, history);

            return response;
        } catch (error) {
            console.error('Error generating LLM response:', error);
            return "I'm having trouble processing your request right now. Please try again in a moment. If the problem persists, contact support.";
        }
    }

    checkRateLimit(chatId) {
        const now = Date.now();
        const minute = Math.floor(now / 60000);

        // Initialize counters if needed
        if (!this.requestCounts.has(minute)) {
            this.requestCounts.clear(); // Clear old minutes
            this.requestCounts.set(minute, 0);
        }

        // Check requests per minute (60 max)
        const requestsThisMinute = this.requestCounts.get(minute);
        if (requestsThisMinute >= 60) {
            return false;
        }

        // Check requests per second (3 max)
        const lastRequest = this.lastRequestTime.get(chatId) || 0;
        if (now - lastRequest < 333) { // 333ms = 1000ms/3 requests
            return false;
        }

        // Update counters
        this.requestCounts.set(minute, requestsThisMinute + 1);
        this.lastRequestTime.set(chatId, now);

        return true;
    }

    async sendResponse(bot, chatId, response) {
        try {
            // First attempt: Try sending with Markdown
            if (response.length <= 4096) {
                try {
                    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
                } catch (markdownError) {
                    // If Markdown fails, send without parsing
                    await bot.sendMessage(chatId, response);
                }
            } else {
                // Split long responses
                for (let i = 0; i < response.length; i += 4096) {
                    const chunk = response.substring(i, Math.min(response.length, i + 4096));
                    try {
                        await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
                    } catch (markdownError) {
                        // If Markdown fails, send without parsing
                        await bot.sendMessage(chatId, chunk);
                    }
                }
            }
        } catch (error) {
            console.error('Error sending response:', error);
            await bot.sendMessage(chatId, '❌ Sorry, I encountered an error while processing your request.');
        }
    }

    async detectIntent(message) {
        try {
            const prompt = `
            You are an intent detector for a meme bot. Analyze if this message indicates the user wants to see a meme.
            If they mention a specific subreddit, extract it.
            
            Respond in this format:
            - If user wants a random meme: "meme:random"
            - If user specifies a subreddit: "meme:subredditname" (without r/ prefix)
            - If not asking for meme: "other"
            
            Examples:
            "send me a meme" -> "meme:random"
            "get a meme from r/memes" -> "meme:memes"
            "show meme from dankmemes" -> "meme:dankmemes"
            "how are you" -> "other"
            
            Message: "${message}"
            `;

            const result = await this.model.generateContent(prompt);
            const response = result.response.text().toLowerCase().trim();
            
            if (response.startsWith('meme:')) {
                const [intent, subreddit] = response.split(':');
                return {
                    type: 'meme',
                    subreddit: subreddit === 'random' ? null : subreddit
                };
            }
            
            return {
                type: 'other',
                subreddit: null
            };
        } catch (error) {
            console.error('Error detecting intent:', error);
            return {
                type: 'other',
                subreddit: null
            };
        }
    }
}

export const llmService = new LLMService(); 