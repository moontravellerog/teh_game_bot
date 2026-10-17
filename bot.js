// Safe dotenv check: loads locally if present, ignores silently on Railway
try { require('dotenv').config(); } catch (e) {}

const TelegramBot = require('node-telegram-bot-api');

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("FATAL ERROR: TELEGRAM_BOT_TOKEN is not defined in environment variables.");
    process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const TARGET_ADDRESS = '0xB8698CfFFdAAf26ca21fE8aA560c18cc2b2f5996';
let lastSeenTxHash = null;
let lastSpokenTime = 0;

console.log(`[${new Date().toISOString()}] TEH OPERATOR // SYSTEM BOOTING...`);

// 1. REGISTER TELEGRAM COMMAND AUTOCOMPLETE MENU
bot.setMyCommands([
    { command: '/scan', description: 'Force real-time OSINT scan for breaking developments' },
    { command: '/website', description: 'Access teh official encrypted archive & dossier' },
    { command: '/price', description: 'Check live PulseChain ecosystem telemetry' },
    { command: '/help', description: 'Display available surveillance directives' }
]).then(() => {
    console.log(`[${new Date().toISOString()}] Command menu successfully registered.`);
}).catch(err => {
    console.error("Failed to register command menu:", err.message);
});

// 2. BOOT NOTIFICATION
if (process.env.TELEGRAM_CHAT_ID) {
    bot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
        `<code>[ TEH OPERATOR // SYSTEM ONLINE ]</code>\n\n` +
        `<i>Live OSINT wire synchronized. Monitoring global data streams and target wallet <code>${TARGET_ADDRESS.substring(0, 6)}...${TARGET_ADDRESS.substring(38)}</code>...</i>`,
        { parse_mode: 'HTML' }
    ).catch(e => console.log("Boot alert notice error:", e.message));
}

// 3. WELCOME NEW MEMBERS PROTOCOL
bot.on('new_chat_members', (msg) => {
    const newMembers = msg.new_chat_members;
    const chatId = msg.chat.id;

    newMembers.forEach((member) => {
        if (member.is_bot) return;
        const name = member.first_name || "Subject";
        const welcomeMessage = 
            `👁 <b>NEW PEER DETECTED IN THE MESH</b>\n\n` +
            `Welcome to teh fold, <b>${name}</b>.\n\n` +
            `Every transaction leaves a trace. Every belief has a ledger. What brought you here?\n\n` +
            `<code>Directive: Type /help or /website to inspect the archive.</code>`;

        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
    });
});

// 4. TELEGRAM COMMANDS
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `<code>[ SYSTEM READY // DIRECTIVES ACTIVE ]</code>\n\n` +
        `TeH Operator monitors the consensus and tracks on-chain movements.\n\n` +
        `Use /scan to query breaking dispatches, /website for the primary dossier, or /price for live telemetry.`,
        { parse_mode: 'HTML' }
    );
});

bot.onText(/\/website/, (msg) => {
    const message = 
        `🌐 <b>CENTRAL INVESTIGATION ARCHIVE // ENCRYPTED DOSSIER</b>\n\n` +
        `Primary investigative repository, interactive timelines, and ecosystem telemetry:\n\n` +
        `🔗 <a href="https://tehgame.xyz">https://tehgame.xyz</a>\n\n` +
        `<i>"What if teh game has already started, and you just haven't noticed?"</i>`;

    bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML', disable_web_page_preview: false });
});

bot.onText(/\/help/, (msg) => {
    const helpMsg = 
        `<code>[ AVAILABLE PROTOCOLS ]</code>\n\n` +
        `• <b>/website</b> - Link to teh primary dossier\n` +
        `• <b>/scan</b> - Force an immediate global intelligence news scan\n` +
        `• <b>/price</b> - Query live PulseChain DEX telemetry\n` +
        `• <b>Target Surveillance</b> - Automatic 90s surveillance on target address`;
    bot.sendMessage(msg.chat.id, helpMsg, { parse_mode: 'HTML' });
});

bot.onText(/\/price/, async (msg) => {
    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27,0x95B303987A60C71504D99Aa1b13B4DA07b0790ab,0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39`);
        if (!res.ok) throw new Error("DexScreener API offline");
        const data = await res.json();
        const pairs = (data && data.pairs) ? data.pairs.filter(p => p.chainId === 'pulsechain') : [];

        let output = `📊 <b>LIVE PULSECHAIN TELEMETRY</b>\n\n`;
        const tokens = [
            { symbol: 'PLS', name: 'PulseChain' },
            { symbol: 'PLSX', name: 'PulseX' },
            { symbol: 'HEX', name: 'HEX (PulseChain)' }
        ];

        tokens.forEach(t => {
            const pair = pairs.find(p => p.baseToken && p.baseToken.symbol.toUpperCase() === t.symbol);
            if (pair) {
                const price = pair.priceUsd ? `$${Number(pair.priceUsd).toFixed(6)}` : 'N/A';
                const chg = pair.priceChange?.h24 !== undefined ? `${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24}%` : '0%';
                output += `• <b>${t.symbol}</b>: <code>${price}</code> (${chg} 24h)\n`;
            }
        });

        output += `\n<i>Telemetry verified directly via DexScreener (Chain 369).</i>`;
        bot.sendMessage(msg.chat.id, output, { parse_mode: 'HTML' });
    } catch (err) {
        bot.sendMessage(msg.chat.id, `⚠️ <i>Unable to reach DexScreener endpoints. Try again shortly.</i>`, { parse_mode: 'HTML' });
    }
});

bot.onText(/\/scan/, async (msg) => {
    bot.sendMessage(msg.chat.id, `<code>[ 📡 MANUAL OVERRIDE: SCANNING LIVE WEB... ]</code>`, { parse_mode: 'HTML' });
    try {
        const searchQuery = 'Richard Heart OR PulseChain OR "Richard Schueler" OR HEX crypto';
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
        
        if (!res.ok) throw new Error("RSS bridge offline");
        const data = await res.json();
        const items = data.items || [];

        if (items.length === 0) {
            return bot.sendMessage(msg.chat.id, `<i>No recent dispatches returned from wire.</i>`, { parse_mode: 'HTML' });
        }

        let message = `🛰 <b>INTELLIGENCE WIRE: LATEST DISPATCHES</b>\n\n`;
        items.slice(0, 3).forEach((art) => {
            const dateStr = art.pubDate ? art.pubDate.substring(0, 16) : "Recent";
            message += `• <a href="${art.link}"><b>${art.title}</b></a>\n  <i>${dateStr} // ${art.author || 'Wire'}</i>\n\n`;
        });

        bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (e) {
        bot.sendMessage(msg.chat.id, `⚠️ <i>Wire scan failed: ${e.message}</i>`, { parse_mode: 'HTML' });
    }
});

// 5. PASSIVE SURVEILLANCE ENGINE
const TRIGGER_RESPONSES = [
    {
        words: ['sec', 'court', 'lawsuit', 'dismissed', 'judge'],
        reply: "The Eastern District of New York closed its file in 2025 on extraterritorial grounds. Code remains indifferent to territorial lines."
    },
    {
        words: ['oa', 'origin address', 'whale'],
        reply: "You speak of the Origin Address. A ledger records movements, but never custody. Are you tracking the wallet, or the shadow it casts?"
    },
    {
        words: ['rick', 'bot'],
        reply: "Rick reports the price. I observe what it costs you to look."
    },
    {
        words: ['5555', 'stake', 'time'],
        reply: "Fifteen years locked in immutable bytecode. Did you stake the token, or did the token stake you?"
    }
];

bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const text = msg.text.toLowerCase();
    const now = Date.now();

    // 15-minute global cooldown between passive interjections
    if (now - lastSpokenTime < 15 * 60 * 1000) return;

    for (const item of TRIGGER_RESPONSES) {
        if (item.words.some(word => text.includes(word))) {
            lastSpokenTime = now;
            setTimeout(() => {
                bot.sendMessage(msg.chat.id, `<code>[ INTERCEPT ]</code>\n\n<i>"${item.reply}"</i>`, {
                    parse_mode: 'HTML',
                    reply_to_message_id: msg.message_id
                }).catch(() => {});
            }, 3000);
            break;
        }
    }
});

// 6. ON-CHAIN WALLET SURVEILLANCE
async function monitorTargetAddress() {
    try {
        console.log(`[${new Date().toISOString()}] SURVEILLANCE: Polling on-chain data for ${TARGET_ADDRESS}...`);

        const endpoints = [
            `https://api.scan.pulsechain.com/api/v2/addresses/${TARGET_ADDRESS}/transactions`,
            `https://scan.pulsechain.com/api/v2/addresses/${TARGET_ADDRESS}/transactions`
        ];

        let data = null;

        for (const url of endpoints) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        'Origin': 'https://scan.pulsechain.com',
                        'Referer': 'https://scan.pulsechain.com/'
                    }
                });

                if (!response.ok) continue;

                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) continue;

                const json = await response.json();
                if (json && json.items) {
                    data = json;
                    break;
                }
            } catch (err) {
                // Try next endpoint
            }
        }

        if (!data || !data.items || data.items.length === 0) {
            console.log(`[SURVEILLANCE WARNING] Explorer returned non-JSON/Cloudflare challenge. Skipping cycle.`);
            return;
        }

        const latestTx = data.items[0];

        // Establish baseline hash on boot
        if (lastSeenTxHash === null) {
            lastSeenTxHash = latestTx.hash;
            console.log(`[SURVEILLANCE] Initialized. Watching for transactions newer than: ${lastSeenTxHash}`);
            return;
        }

        // New transaction detected
        if (latestTx.hash !== lastSeenTxHash) {
            lastSeenTxHash = latestTx.hash;

            const isOutgoing = latestTx.from && latestTx.from.hash && latestTx.from.hash.toLowerCase() === TARGET_ADDRESS.toLowerCase();
            const direction = isOutgoing ? "🔴 OUTBOUND TRANSFER" : "🟢 INBOUND TRANSFER";

            let valueStr = "0";
            if (latestTx.value) {
                const plsValue = parseFloat(latestTx.value) / 1e18;
                valueStr = plsValue.toLocaleString(undefined, { maximumFractionDigits: 4 });
            }

            const method = latestTx.method || "Transfer";

            const message = 
                `🚨 <b>ON-CHAIN INTERCEPT</b> 🚨\n\n` +
                `<b>Target:</b> <code>${TARGET_ADDRESS.substring(0, 6)}...${TARGET_ADDRESS.substring(38)}</code>\n` +
                `<b>Action:</b> ${direction}\n` +
                `<b>Method:</b> ${method}\n` +
                `<b>Value:</b> ${valueStr} PLS\n\n` +
                `<a href="https://scan.pulsechain.com/tx/${latestTx.hash}">[ View on PulseScan ]</a>`;

            if (process.env.TELEGRAM_CHAT_ID) {
                bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                });
            }
        }
    } catch (error) {
        console.log(`[SURVEILLANCE ERROR] Failed cycle: ${error.message}`);
    }
}

// 90-second polling interval + initial run 5s after boot
setInterval(monitorTargetAddress, 90000);
setTimeout(monitorTargetAddress, 5000);
