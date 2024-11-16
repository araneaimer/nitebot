export function setupTicTacToeCommand(bot) {
    bot.onText(/\/(tictactoe|ttt)/, async (msg) => {
        const chatId = msg.chat.id;
        
        try {
            await bot.sendMessage(
                chatId,
                "🎮 Let's play Tic Tac Toe!",
                {
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: "Start Game",
                                web_app: {
                                    url: "https://localhost:8443"
                                }
                            }
                        ]]
                    }
                }
            );
        } catch (error) {
            console.error('Error starting Tic Tac Toe:', error);
            await bot.sendMessage(
                chatId,
                "❌ Sorry, couldn't start the game. Please try again later."
            );
        }
    });

    // Handle game results
    bot.on('web_app_data', async (msg) => {
        try {
            const data = JSON.parse(msg.web_app_data.data);
            if (data.type === 'game_result') {
                await bot.sendMessage(
                    msg.chat.id,
                    `🎮 Game Over!\n${data.result}`
                );
            }
        } catch (error) {
            console.error('Error handling game result:', error);
        }
    });
}
