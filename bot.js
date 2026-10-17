const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');

// Initialize the RSS Parser
const parser = new Parser();

// Bot Username: @Teh_game_bot
// Load Token from Railway Environment Variables (Keep this secret!)
const token = process.env.TELEGRAM_BOT_TOKEN;

// Hardcoded Chat ID for your specific Telegram group
const chatId = '-1004387588820';

if (!token) {
    console.error("FATAL ERROR: TELEGRAM_BOT_TOKEN is missing. Please set it in Railway Variables.");
    process.exit(1);
}

// Initialize the Telegram Bot
const bot = new TelegramBot(token, { polling: true });

// We keep track of the most recent article date so we don't spam old news
let lastSeenDate = new Date();

// Orthography Enforcer (Matches the website)
function enforceTehText(str) {
    if (!str || typeof str !== 'string') return str;
    return str
        .replace(/\bTHE\b/g, 'TEH')
        .replace(/\bThe\b/g, 'Teh')
        .replace(/\bthe\b/g, 'teh');
}

// The core scanning function
async function scanLiveNews() {
    try {
        console.log(`[${new Date().toISOString()}] Scanning global OSINT wire...`);
        
        // Using the same search query as the website
        const searchQuery = 'Richard Heart OR PulseChain OR HEX crypto';
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
        
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items && feed.items.length > 0) {
            // Check the newest articles first
            // We reverse the slice so that if multiple new articles drop, they send in chronological order
            const recentItems = feed.items.slice(0, 5).reverse();
            
            for (const item of recentItems) {
                const articleDate = new Date(item.pubDate);
                
                // If the article is newer than our last check, broadcast it
                if (articleDate > lastSeenDate) {
                    const safeTitle = enforceTehText(item.title || 'Untitled Dispatch');
                    const safeSource = enforceTehText(item.creator || item.source || 'Global News Wire');
                    
                    const message = `🚨 <b>LIVE INTELLIGENCE INTERCEPT</b>\n\n` +
                                    `<b>SOURCE:</b> ${safeSource}\n` +
                                    `<b>DISPATCH:</b> ${safeTitle}\n\n` +
                                    `🔗 <a href="${item.link}">[ VERIFY PRIMARY SOURCE ]</a>\n\n` +
                                    `<i>"Every ledger records what moved. It never records why you believed it would make you free." — Teh Operator</i>`;
                    
                    // Send to Telegram
                    await bot.sendMessage(chatId, message, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: false
                    });
                    
                    console.log(`Broadcasted new article: ${safeTitle}`);
                    
                    // Update our time anchor
                    lastSeenDate = articleDate;
                }
            }
        }
    } catch (error) {
        console.error("Error fetching or parsing RSS feed:", error.message);
    }
}

// Boot Sequence
console.log("TeH GAME OSINT Bot Starting...");
bot.sendMessage(chatId, "<code>[ TEH OPERATOR // SYSTEM ONLINE ]</code>\n\n<i>Live OSINT wire synchronized. Monitoring global data streams...</i>", { parse_mode: 'HTML' })
   .catch(err => console.error("Failed to send boot message. Check Chat ID.", err.message));

// Run the scan immediately on startup
scanLiveNews();

// Then run it every 15 minutes (900,000 milliseconds)
setInterval(scanLiveNews, 15 * 60 * 1000);

// Optional: Allow users in the group to manually type /scan to trigger a check
bot.onText(/\/scan/, (msg) => {
    if (msg.chat.id.toString() === chatId) {
        bot.sendMessage(chatId, "<code>[ 📡 MANUAL OVERRIDE: SCANNING LIVE WEB... ]</code>", { parse_mode: 'HTML' });
        scanLiveNews();
    }
});

// ==========================================
// NEW FEATURE 1: LIVE ON-CHAIN PRICES (/price)
// ==========================================
bot.onText(/\/price/, async (msg) => {
    if (msg.chat.id.toString() !== chatId) return;
    
    try {
        const loadingMsg = await bot.sendMessage(chatId, "<code>[ 📡 QUERYING CHAIN ID 369 TELEMETRY... ]</code>", { parse_mode: 'HTML' });
        
        // Addresses for PLS, PLSX, HEX, INC
        const addresses = '0xA1077a294dDE1B09bB078844df40758a5D0f9a27,0x95B303987A60C71504D99Aa1b13B4DA07b0790ab,0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39,0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d';
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`);
        const data = await response.json();
        
        if (data && data.pairs) {
            const plsPairs = data.pairs.filter(p => p.chainId === 'pulsechain');
            
            let priceMessage = `🚨 <b>LIVE PULSECHAIN TELEMETRY</b>\n<i>Source: DexScreener (Chain 369)</i>\n\n`;
            
            const tokens = ['PLS', 'PLSX', 'HEX', 'INC'];
            tokens.forEach(ticker => {
                const tokenPairs = plsPairs.filter(p => p.baseToken && p.baseToken.symbol.toUpperCase() === ticker);
                tokenPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
                
                if (tokenPairs.length > 0) {
                    const best = tokenPairs[0];
                    const price = Number(best.priceUsd).toFixed(6);
                    const change = best.priceChange?.h24 || 0;
                    const changeIcon = change >= 0 ? '🟢' : '🔴';
                    const liq = best.liquidity?.usd ? `$${Math.round(best.liquidity.usd).toLocaleString()}` : 'N/A';
                    
                    priceMessage += `<b>${ticker}:</b> $${price} ${changeIcon} (${change}%)\n`;
                    priceMessage += `💧 <i>Liq: ${liq}</i>\n\n`;
                }
            });
            
            bot.editMessageText(priceMessage, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parse_mode: 'HTML'
            });
        }
    } catch (error) {
        console.error("Price fetch error:", error);
        bot.sendMessage(chatId, "<code>[ ERROR: TELEMETRY UNAVAILABLE. DEXSCREENER API OFFLINE. ]</code>", { parse_mode: 'HTML' });
    }
});

// ==========================================
// NEW FEATURE 2: CRYPTIC PUZZLE CLUES (/clue)
// ==========================================
const clues = [
    "<i>Clue 01:</i> What happens when you convert teh raw hex payload '54 52 55 54 48 5F 49 53 5F 53 54 41 4B 45 44' into ASCII text?",
    "<i>Clue 02:</i> Look closely at teh numerical constants of teh universe. Chain ID. Max stake length. They connect with a hyphen.",
    "<i>Clue 03:</i> There is a chronological anomaly in teh timeline. Notice teh recurring UTC timestamp. 03:09.",
    "<i>System Note:</i> Chamber 5555 remains sealed. Type DECODE in teh website terminal if you need assistance."
];

bot.onText(/\/clue/, (msg) => {
    if (msg.chat.id.toString() !== chatId) return;
    const randomClue = clues[Math.floor(Math.random() * clues.length)];
    const message = `👁‍🗨 <b>TEH OPERATOR // INTERCEPT</b>\n\n${enforceTehText(randomClue)}`;
    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

// ==========================================
// NEW FEATURE 3: DAILY LORE DROPS
// ==========================================
const loreMessages = [
    "Every ledger records what moved. It never records why you believed it would make you free.",
    "When there are two copies of reality, which one decides what is valuable?",
    "To sacrifice is to make sacred. Notice how carefully legal disclaimers and quasi-religious language intertwine.",
    "A smart contract executes teh exact same opcodes in Brooklyn, Helsinki, and Istanbul.",
    "Five thousand five hundred and fifty-five days is fifteen years. Who are you fifteen years from now?"
];

// Send a random lore message every 24 hours (86,400,000 milliseconds)
setInterval(() => {
    const randomLore = loreMessages[Math.floor(Math.random() * loreMessages.length)];
    const message = `🎙 <b>TRANSMISSION // TEH OPERATOR</b>\n\n<i>"${enforceTehText(randomLore)}"</i>`;
    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
}, 24 * 60 * 60 * 1000);