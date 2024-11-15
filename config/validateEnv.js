export function validateEnvironment() {
    const requiredVars = [
        'TELEGRAM_BOT_TOKEN',
        'HUGGING_FACE_TOKEN',
        'GOOGLE_AI_API_KEY',
        'ADMIN_USER_ID',
        'YVAINE_CHAT_ID',
        'ARANE_CHAT_ID',
        'TMDB_API_KEY',
        'UNSPLASH_ACCESS_KEY',
        'PIXABAY_API_KEY'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        console.error('❌ Environment Validation Failed!');
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please check your .env file and ensure all required variables are set.');
        process.exit(1);
    }
}
