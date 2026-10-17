const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
    console.error("CRITICAL ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.");
    process.exit(1);
}

// Initialize the bot using polling
const bot = new TelegramBot(token, { polling: true });
const parser = new Parser();

// The address we are monitoring on PulseChain
const TARGET_ADDRESS = '0xB8698CfFFdAAf26ca21fE8aA560c18cc2b2f5996';
let lastSeenTxHash = null;

// Memory for news and cooldowns
let lastNewsTime = new Date();
let lastSurveillanceReply = 0; // Timestamp for passive surveillance cooldown

// Setup the autocomplete command menu in Telegram
bot.setMyCommands([
    { command: 'scan', description: 'Force a manual OSINT and DEX scan' },
    { command: 'website', description: 'Access the official TeH GAME Archive' },
    { command: 'price', description: 'Query market telemetry' },
    { command: 'help', description: 'Display system instructions' }
]);

console.log(`[ ${new Date().toISOString()} ] TEH OPERATOR // SYSTEM BOOTING...`);

// Send a boot message to the group
bot.sendMessage(chatId, `[ TEH OPERATOR // SYSTEM ONLINE ]\n\n<i>Live OSINT wire synchronized. Monitoring global data streams...</i>`, { parse_mode: 'HTML' });

// --- COMMAND: /website ---
bot.onText(/^\/website/, (msg) => {
    if (msg.chat.id.toString() !== chatId) return;
    const response = `[ SECURE ARCHIVE LINK ]\n\nAccess teh unredacted dossier and interactive terminal here:\n🌐 https://tehgame.xyz`;
    bot.sendMessage(chatId, response, { disable_web_page_preview: true });
});

// --- COMMAND: /help ---
bot.onText(/^\/help/, (msg) => {
    if (msg.chat.id.toString() !== chatId) return;
    const response = `<b>TEH OPERATOR SYSTEM STATUS</b>\n\n` +
                     `/scan - Force live web search for RH/PulseChain news\n` +
                     `/website - Link to the encrypted dossier\n` +
                     `/price - Financial telemetry\n\n` +
                     `<i>Note: I am silently monitoring target address ${TARGET_ADDRESS.substring(0,6)}...</i>`;
    bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
});

// --- COMMAND: /price ---
bot.onText(/^\/price/, (msg) => {
    if (msg.chat.id.toString() !== chatId) return;
    // Since the Rick bot is in the group, Teh Operator can defer or act mysterious
    bot.sendMessage(chatId, `<i>Teh Operator does not care for tickers. Ask Rick. I only measure time.</i>`, { parse_mode: 'HTML' });
});

// --- COMMAND: /scan (MANUAL OVERRIDE) ---
bot.onText(/^\/scan/, async (msg) => {
    if (msg.chat.id.toString() !== chatId) return;
    
    bot.sendMessage(chatId, `[ 📡 MANUAL OVERRIDE: SCANNING LIVE WEB... ]`);
    
    try {
        const query = 'Richard Heart OR PulseChain OR "Richard Schueler" OR HEX crypto';
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data && data.contents) {
            const matchTitles = [...data.contents.matchAll(/<title>(.*?)<\/title>/g)].map(m => m[1]).slice(1, 4);
            const matchLinks = [...data.contents.matchAll(/<link>(.*?)<\/link>/g)].map(m => m[1]).slice(1, 4);
            
            if (matchTitles.length > 0) {
                let report = `🚨 <b>LIVE OSINT DISPATCH</b> 🚨\n\n`;
                for(let i = 0; i < matchTitles.length; i++) {
                    report += `• <a href="${matchLinks[i]}">${matchTitles[i].replace(' - ', ' | ')}</a>\n\n`;
                }
                bot.sendMessage(chatId, report, { parse_mode: 'HTML', disable_web_page_preview: true });
            } else {
                bot.sendMessage(chatId, `<i>No recent anomalies detected in the global wire.</i>`, { parse_mode: 'HTML' });
            }
        }
    } catch (err) {
        bot.sendMessage(chatId, `[ ERROR: CONNECTION TO GLOBAL WIRE SEVERED ]`);
    }
});

// --- NEW PEER WELCOME PROTOCOL ---
bot.on('new_chat_members', (msg) => {
    if (msg.chat.id.toString() !== chatId) return;
    msg.new_chat_members.forEach(user => {
        const name = user.first_name || 'Initiate';
        const welcomeMsg = `[ NEW PEER DETECTED ]\n\nWelcome to the archive, <b>${name}</b>. \n\nEvery ledger records what moved. We record why you believed it would make you free.\n\nType /website to begin your investigation.`;
        bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'HTML' });
    });
});

// --- PASSIVE KEYWORD SURVEILLANCE ---
bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== chatId || !msg.text) return;
    
    // 15 minute cooldown (900000 ms) so it isn't spammy
    const now = Date.now();
    if (now - lastSurveillanceReply < 900000) return;

    const text = msg.text.toLowerCase();
    let loreReply = "";

    if (text.includes('sacrifice')) {
        loreReply = `<i>To sacrifice is to make sacred. Notice how carefully legal disclaimers and quasi-religious language intertwine when billions are in motion.</i>`;
    } else if (text.includes('sec') || text.includes('court') || text.includes('lawsuit')) {
        loreReply = `<i>Case closed in Brooklyn. The borders of the nation-state collided with the borderless architecture of the protocol.</i>`;
    } else if (text.includes(' oa ') || text.includes('origin address')) {
        loreReply = `<i>Code cannot be bribed. But markets are made of people, and people always watch the largest shadow in the room.</i>`;
    } else if (text.includes('5555')) {
        loreReply = `<i>Fifteen years of human life locked inside bytecode. Did they lock the token, or did the token lock them?</i>`;
    } else if (text.includes('rick')) {
        loreReply = `<i>Rick tracks the price. I track the psychological cost. Both are currently volatile.</i>`;
    }

    if (loreReply !== "") {
        lastSurveillanceReply = now;
        bot.sendMessage(chatId, loreReply, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    }
});

// --- ON-CHAIN TARGET ADDRESS SURVEILLANCE ---
async function monitorTargetAddress() {
    try {
        console.log(`[${new Date().toISOString()}] SURVEILLANCE: Polling on-chain data for ${TARGET_ADDRESS}...`);
        
        // Query the live PulseChain Blockscout V2 API with headers to bypass Cloudflare blocks
        const response = await fetch(`https://scan.pulsechain.com/api/v2/addresses/${TARGET_ADDRESS}/transactions`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Safety check: If the explorer returns a 403/500 HTML page, stop here and try again later
        if (!response.ok) {
            console.log(`[SURVEILLANCE] API returned status ${response.status}. Skipping this cycle.`);
            return; 
        }

        const data = await response.json();
        
        // Ensure items array exists
        if (!data || !data.items || data.items.length === 0) return;

        const latestTx = data.items[0];

        // Initialization: If this is the first boot, just memorize the latest hash and stop.
        if (lastSeenTxHash === null) {
            lastSeenTxHash = latestTx.hash;
            console.log(`[SURVEILLANCE] Initialized. Watching for transactions newer than: ${lastSeenTxHash}`);
            return;
        }

        // If it's a new transaction we haven't seen yet!
        if (latestTx.hash !== lastSeenTxHash) {
            lastSeenTxHash = latestTx.hash; // update our memory
            
            // Format the alert
            const isOutgoing = latestTx.from.hash.toLowerCase() === TARGET_ADDRESS.toLowerCase();
            const direction = isOutgoing ? "🔴 OUTBOUND TRANSFER" : "🟢 INBOUND TRANSFER";
            
            // Convert wei to whole PLS (Blockscout returns string wei value)
            let valueStr = "0";
            if (latestTx.value) {
                const plsValue = parseFloat(latestTx.value) / 1e18;
                valueStr = plsValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
            }

            const method = latestTx.method || "Transfer";

            const message = `🚨 <b>ON-CHAIN INTERCEPT</b> 🚨\n\n` +
                            `<b>Target:</b> <code>${TARGET_ADDRESS.substring(0,6)}...${TARGET_ADDRESS.substring(38)}</code>\n` +
                            `<b>Action:</b> ${direction}\n` +
                            `<b>Method:</b> ${method}\n` +
                            `<b>Value:</b> ${valueStr} PLS\n\n` +
                            `<a href="https://scan.pulsechain.com/tx/${latestTx.hash}">[ View on PulseScan ]</a>`;

            bot.sendMessage(chatId, message, { parse_mode: 'HTML', disable_web_page_preview: true });
        }

    } catch (error) {
        // Silently catch the error in the console so the bot doesn't crash
        console.log(`[SURVEILLANCE WARNING] Could not parse explorer data this cycle. Retrying in 90s.`);
    }
}

// Start the 90-second polling interval for the wallet watcher
setInterval(monitorTargetAddress, 90000);

// --- BACKGROUND RSS AUTO-SCANNER ---
async function checkNews() {
    try {
        const query = 'Richard Heart OR PulseChain OR "Richard Schueler" OR HEX crypto';
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data && data.contents) {
            const matchTitles = [...data.contents.matchAll(/<title>(.*?)<\/title>/g)].map(m => m[1]);
            const matchLinks = [...data.contents.matchAll(/<link>(.*?)<\/link>/g)].map(m => m[1]);
            const matchDates = [...data.contents.matchAll(/<pubDate>(.*?)<\/pubDate>/g)].map(m => new Date(m[1]));
            
            // Only look at the newest article
            if (matchTitles.length > 1 && matchDates.length > 0) {
                const articleDate = matchDates[0];
                
                // If the article is newer than our last check, broadcast it!
                if (articleDate > lastNewsTime) {
                    lastNewsTime = articleDate; // Update memory
                    
                    const report = `🚨 <b>NEW INTEL INTERCEPTED</b> 🚨\n\n• <a href="${matchLinks[1]}">${matchTitles[1].replace(' - ', ' | ')}</a>`;
                    bot.sendMessage(chatId, report, { parse_mode: 'HTML', disable_web_page_preview: true });
                }
            }
        }
    } catch (err) {
        console.log("[AUTO-SCANNER] Background wire check failed quietly.");
    }
}

// Check for new articles automatically every 15 minutes
setInterval(checkNews, 900000);
