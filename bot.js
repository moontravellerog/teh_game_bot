const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');

const parser = new Parser();

// Load Token and Chat ID from Railway Environment Variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID; 

if (!token) {
    console.error("FATAL ERROR: TELEGRAM_BOT_TOKEN is missing.");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Time anchor for background polling (prevents spamming old news)
let lastSeenDate = new Date();

function enforceTehText(str) {
    if (!str || typeof str !== 'string') return str;
    return str
        .replace(/\bTHE\b/g, 'TEH')
        .replace(/\bThe\b/g, 'Teh')
        .replace(/\bthe\b/g, 'teh');
}

// Core scanning function with a "manual" override mode
async function scanLiveNews(isManual = false) {
    try {
        console.log(`[${new Date().toISOString()}] Scanning global OSINT wire... (Manual: ${isManual})`);
        
        const searchQuery = 'Richard Heart OR PulseChain OR HEX crypto';
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
        
        const feed = await parser.parseURL(rssUrl);
        
        if (feed.items && feed.items.length > 0) {
            if (isManual) {
                // MANUAL MODE: Ignore the time filter and just print the top 3 latest articles instantly
                const topItems = feed.items.slice(0, 3);
                for (const item of topItems) {
                    const safeTitle = enforceTehText(item.title || 'Untitled Dispatch');
                    const safeSource = enforceTehText(item.creator || item.source || 'Global News Wire');
                    
                    const message = `🚨 <b>LIVE INTELLIGENCE INTERCEPT</b>\n\n` +
                                    `<b>SOURCE:</b> ${safeSource}\n` +
                                    `<b>DISPATCH:</b> ${safeTitle}\n\n` +
                                    `🔗 <a href="${item.link}">[ VERIFY PRIMARY SOURCE ]</a>`;
                    
                    await bot.sendMessage(chatId, message, { parse_mode: 'HTML', disable_web_page_preview: true });
                }
            } else {
                // AUTO MODE: Only broadcast if the article is newer than our last check
                const recentItems = feed.items.slice(0, 5).reverse();
                for (const item of recentItems) {
                    const articleDate = new Date(item.pubDate);
                    if (articleDate > lastSeenDate) {
                        const safeTitle = enforceTehText(item.title || 'Untitled Dispatch');
                        const safeSource = enforceTehText(item.creator || item.source || 'Global News Wire');
                        
                        const message = `🚨 <b>LIVE INTELLIGENCE INTERCEPT</b>\n\n` +
                                        `<b>SOURCE:</b> ${safeSource}\n` +
                                        `<b>DISPATCH:</b> ${safeTitle}\n\n` +
                                        `🔗 <a href="${item.link}">[ VERIFY PRIMARY SOURCE ]</a>\n\n` +
                                        `<i>"Every ledger records what moved. It never records why you believed it would make you free." — Teh Operator</i>`;
                        
                        await bot.sendMessage(chatId, message, { parse_mode: 'HTML', disable_web_page_preview: false });
                        console.log(`Broadcasted new article: ${safeTitle}`);
                        lastSeenDate = articleDate;
                    }
                }
            }
        } else if (isManual) {
            bot.sendMessage(chatId, "<code>[ 📡 SCAN COMPLETE: NO RELEVANT DATA FOUND ]</code>", { parse_mode: 'HTML' });
        }
    } catch (error) {
        console.error("Error fetching or parsing RSS feed:", error.message);
        if (isManual) {
            bot.sendMessage(chatId, "<code>[ 📡 ERROR: RSS FEED UNREACHABLE ]</code>", { parse_mode: 'HTML' });
        }
    }
}

// Boot Sequence
console.log("TeH GAME OSINT Bot Starting...");
bot.sendMessage(chatId, "<code>[ TEH OPERATOR // SYSTEM ONLINE ]</code>\n\n<i>Live OSINT wire synchronized. Monitoring global data streams...</i>", { parse_mode: 'HTML' })
   .catch(err => console.error("Failed to send boot message. Check Chat ID.", err.message));

// Register the autocomplete command menu with Telegram
bot.setMyCommands([
    { command: '/scan', description: 'Intercept live global OSINT dispatches' },
    { command: '/price', description: 'Query Chain ID 369 DEX telemetry' },
    { command: '/clue', description: 'Request a cryptic cryptographic hint' }
]).then(() => console.log("Command menu successfully registered."))
  .catch(err => console.error("Failed to register commands: ", err.message));

// Run the automated background scan every 15 minutes
setInterval(() => scanLiveNews(false), 15 * 60 * 1000);

// Manual Scan Command
bot.onText(/\/scan/, (msg) => {
    if (msg.chat.id.toString() === chatId) {
        bot.sendMessage(chatId, "<code>[ 📡 MANUAL OVERRIDE: SCANNING LIVE WEB... ]</code>", { parse_mode: 'HTML' });
        scanLiveNews(true);
    }
});

// Live On-Chain Prices
bot.onText(/\/price/, async (msg) => {
    if (msg.chat.id.toString() !== chatId) return;
    
    try {
        const loadingMsg = await bot.sendMessage(chatId, "<code>[ 📡 QUERYING CHAIN ID 369 TELEMETRY... ]</code>", { parse_mode: 'HTML' });
        
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

// Cryptic Puzzle Clues
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
// NEW: PASSIVE SURVEILLANCE ENGINE
// ==========================================
let surveillanceCooldown = false;
const cooldownTime = 15 * 60 * 1000; // 15 minutes between creepy replies

const triggerWords = ['sacrifice', 'sec', 'oa', 'origin address', '5555', 'richard', 'heart', 'court', 'interpol', 'rick'];

const observerResponses = [
    "Are you asking teh right questions, or just teh questions teh ledger allows you to ask?",
    "Teh Origin Address does not speak. It only observes. Just like me.",
    "Code cannot be bribed, but markets are made of people. Who are you trusting?",
    "You look at teh charts. But who is looking at you?",
    "Every sacrifice leaves a trace. Even teh ones you think are hidden.",
    "I see you asking Rick for teh price. But does Rick tell you teh cost?",
    "Do not trust teh timestamps. 03:09 is always closer than it appears.",
    "A machine gives you numbers. I give you teh silence between them."
];

bot.on('message', (msg) => {
    // Ignore commands and empty messages
    if (!msg.text || msg.text.startsWith('/')) return;
    // Only monitor the designated group chat
    if (msg.chat.id.toString() !== chatId) return; 

    // If cooldown is active, stay silent
    if (surveillanceCooldown) return;

    const textLower = msg.text.toLowerCase();
    
    // Check if the message contains any of the trigger words
    const isTriggered = triggerWords.some(word => {
        // Use a simple boundary check to avoid matching parts of words (like 'second' for 'sec')
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(textLower);
    });

    if (isTriggered) {
        surveillanceCooldown = true;
        
        const response = observerResponses[Math.floor(Math.random() * observerResponses.length)];
        
        // Add a slight 3-second delay so it feels like someone was actually reading and typing
        setTimeout(() => {
            bot.sendMessage(chatId, `👁‍🗨 <i>"${enforceTehText(response)}"</i>`, { 
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id 
            }).catch(err => console.error(err));
        }, 3000);

        // Reset the cooldown after 15 minutes
        setTimeout(() => {
            surveillanceCooldown = false;
        }, cooldownTime);
    }
});
