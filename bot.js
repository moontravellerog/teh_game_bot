// Safe dotenv check: loads locally if present, ignores silently on Railway
try { require('dotenv').config(); } catch (e) {}

const TelegramBot = require('node-telegram-bot-api');

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("FATAL ERROR: TELEGRAM_BOT_TOKEN is not defined in environment variables.");
    process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// --- 1. INTELLIGENCE ADDRESS BOOK ---
// All addresses must be lowercase for accurate matching
const ADDRESS_BOOK = {
    '0xb8698cfffdaaf26ca21fe8aa560c18cc2b2f5996': 'pDONG WALLET',
    '0xaf10cc6c50defff901b535691550d7af208939c5': 'GOD WHALE 1',
    '0x2bde3b9c0129be4689e245ba689b9b0ae4ac666d': 'GOD WHALE 2',
    '0xf1bd8e36a0e48650bdb28056277b05e851ebbae8': 'GOD WHALE 3',
    '0x828fd91d3e3a9ffa6305e78b9ae2cfbc5b5d9f6b': 'GOD WHALE 4',
    '0x1706d193862da7f8c746aae63d514df93dfa5dbf': 'GOD WHALE 5',
    '0xddf744374b46aa980ddce4a5aa216478bf925cd1': 'GOD WHALE 6',
    '0x2fd56159f4c8664a1de5c75e430338cfa58cd5b9': 'GOD WHALE 7',
    '0x807dc01d44407d3efa0171f6de39076a27f20338': 'GOD WHALE 8',
    '0x3930f94249a66535bc0f177bc567152320dd7e6c': 'GOD WHALE 9',
    '0x41b20fbb9e38abeaef31fa45a9b760d251180a5b': 'GOD WHALE 10',
    '0xf5d7b1b20288b9052e9cbdbf877a19077edb34d8': 'GOD WHALE 11',
    '0xab3c13e0ea435aa388ea4e7bfa7baecc283c92ee': 'HEX WHALE 1',
    '0x1e57ce7e4bcc06f4cfdb7572acb6335ba670920e': 'HEX WHALE 2',
    '0xe059d3e762b11764597225e4c08c7606a16caccc': 'HEX WHALE 3',
    '0x5f2c9a4d47cab74bfc35d5d9cb391687049d8503': 'RACKHAM 1',
    '0x55f983db44b494218ad8288ce02636674c5f9be5': 'RACKHAM 2',
    '0x075e72a5edf65f0a5f44699c7654c1a76941ddc8': 'OA 1',
    '0xa2e1734682c6a237c070d93019a7e0bf7047406c': 'OA 2',
    '0x25b313158ce11080524dca0fd01141eed5f94b81': 'OA 3',
    '0x2d2c2ff3345de305ea06c35c958b0a4fd774abda': 'OA 4',
    '0x9a6a414d6f3497c05e3b1de90520765fa1e07c03': 'OA 5 (HEX OA)',
    '0x4bdbb75f1995f966dbf79e7433424a94845dba00': 'OA 6',
    '0xbb5cbbf47f1a1741195c128c4d00457a4501c177': 'OA 7',
    '0x65a8875862263219d5f230f69385397a88247355': 'OA 8'
};

const TARGET_ADDRESSES = Object.keys(ADDRESS_BOOK);

// Store the latest seen transaction hash for each address on each chain
let memoryState = {
    pulsechain: {},
    ethereum: {}
};

// Helper: Convert address to known name or shorten it
function resolveAddressName(addressStr) {
    if (!addressStr) return "Unknown / Null";
    const lower = addressStr.toLowerCase();
    if (ADDRESS_BOOK[lower]) return ADDRESS_BOOK[lower];
    return `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
}

let lastSpokenTime = 0;

console.log(`[${new Date().toISOString()}] TEH OPERATOR // SYSTEM BOOTING...`);
console.log(`[SYS] Loaded ${TARGET_ADDRESSES.length} target wallets into surveillance mesh.`);

// --- 2. REGISTER COMMAND MENU ---
bot.setMyCommands([
    { command: '/scan', description: 'Force real-time OSINT scan for breaking developments' },
    { command: '/website', description: 'Access teh official encrypted archive & dossier' },
    { command: '/price', description: 'Check live PulseChain ecosystem telemetry' },
    { command: '/help', description: 'Display available surveillance directives' }
]).catch(() => {});

if (process.env.TELEGRAM_CHAT_ID) {
    bot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
        `<code>[ TEH OPERATOR // SYSTEM ONLINE ]</code>\n\n` +
        `<i>Live OSINT wire synchronized. Active surveillance initialized on ${TARGET_ADDRESSES.length} core ecosystem wallets across PulseChain and Ethereum.</i>`,
        { parse_mode: 'HTML' }
    ).catch(() => {});
}

// --- 3. WELCOME PROTOCOL ---
bot.on('new_chat_members', (msg) => {
    const newMembers = msg.new_chat_members;
    newMembers.forEach((member) => {
        if (member.is_bot) return;
        const name = member.first_name || "Subject";
        bot.sendMessage(msg.chat.id, 
            `👁 <b>NEW PEER DETECTED IN THE MESH</b>\n\n` +
            `Welcome to teh fold, <b>${name}</b>.\n\n` +
            `Every transaction leaves a trace. Every belief has a ledger. What brought you here?\n\n` +
            `<code>Directive: Type /help or /website to inspect the archive.</code>`,
            { parse_mode: 'HTML' });
    });
});

// --- 4. TELEGRAM COMMANDS ---
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `<code>[ SYSTEM READY // DIRECTIVES ACTIVE ]</code>\n\nUse /scan to query breaking dispatches, /website for the primary dossier, or /price for live telemetry.`, { parse_mode: 'HTML' });
});

bot.onText(/\/website/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `🌐 <b>CENTRAL INVESTIGATION ARCHIVE</b>\n\n🔗 <a href="https://tehgame.xyz">https://tehgame.xyz</a>\n\n<i>"What if teh game has already started, and you just haven't noticed?"</i>`, 
        { parse_mode: 'HTML', disable_web_page_preview: false });
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `<code>[ AVAILABLE PROTOCOLS ]</code>\n\n• <b>/website</b> - Primary dossier\n• <b>/scan</b> - Global intelligence news scan\n• <b>/price</b> - PulseChain DEX telemetry\n• <b>Target Surveillance</b> - Automatic Multi-Chain Wallet Tracking`, 
        { parse_mode: 'HTML' });
});

bot.onText(/\/price/, async (msg) => {
    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27,0x95B303987A60C71504D99Aa1b13B4DA07b0790ab,0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39`);
        if (!res.ok) throw new Error("API offline");
        const data = await res.json();
        const pairs = (data && data.pairs) ? data.pairs.filter(p => p.chainId === 'pulsechain') : [];
        let output = `📊 <b>LIVE PULSECHAIN TELEMETRY</b>\n\n`;
        const tokens = [{ symbol: 'PLS' }, { symbol: 'PLSX' }, { symbol: 'HEX' }];

        tokens.forEach(t => {
            const pair = pairs.find(p => p.baseToken && p.baseToken.symbol.toUpperCase() === t.symbol);
            if (pair) {
                const price = pair.priceUsd ? `$${Number(pair.priceUsd).toFixed(6)}` : 'N/A';
                const chg = pair.priceChange?.h24 !== undefined ? `${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24}%` : '0%';
                output += `• <b>${t.symbol}</b>: <code>${price}</code> (${chg} 24h)\n`;
            }
        });
        bot.sendMessage(msg.chat.id, output, { parse_mode: 'HTML' });
    } catch (err) {
        bot.sendMessage(msg.chat.id, `⚠️ <i>Unable to reach DexScreener.</i>`, { parse_mode: 'HTML' });
    }
});

bot.onText(/\/scan/, async (msg) => {
    bot.sendMessage(msg.chat.id, `<code>[ 📡 SCANNING LIVE WEB... ]</code>`, { parse_mode: 'HTML' });
    try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent('Richard Heart OR PulseChain OR HEX crypto')}&hl=en-US&gl=US&ceid=US:en`;
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
        const data = await res.json();
        const items = data.items || [];
        if (items.length === 0) return bot.sendMessage(msg.chat.id, `<i>No recent dispatches returned.</i>`, { parse_mode: 'HTML' });
        
        let message = `🛰 <b>INTELLIGENCE WIRE</b>\n\n`;
        items.slice(0, 3).forEach(art => { message += `• <a href="${art.link}"><b>${art.title}</b></a>\n  <i>${art.pubDate ? art.pubDate.substring(0,16) : 'Recent'}</i>\n\n`; });
        bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (e) {
        bot.sendMessage(msg.chat.id, `⚠️ <i>Wire scan failed.</i>`, { parse_mode: 'HTML' });
    }
});

// --- 5. PASSIVE TRIGGERS ---
const TRIGGERS = [
    { words: ['sec', 'court', 'lawsuit'], reply: "The Eastern District of New York closed its file in 2025. Code remains indifferent to territorial lines." },
    { words: ['oa', 'origin address', 'whale'], reply: "You speak of the Origin Address. A ledger records movements, but never custody." },
    { words: ['5555', 'stake', 'time'], reply: "Fifteen years locked in immutable bytecode. Did you stake the token, or did the token stake you?" }
];

bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const text = msg.text.toLowerCase();
    const now = Date.now();
    if (now - lastSpokenTime < 15 * 60 * 1000) return;

    for (const item of TRIGGERS) {
        if (item.words.some(w => text.includes(w))) {
            lastSpokenTime = now;
            setTimeout(() => { bot.sendMessage(msg.chat.id, `<code>[ INTERCEPT ]</code>\n\n<i>"${item.reply}"</i>`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id }); }, 3000);
            break;
        }
    }
});

// --- 6. MULTI-CHAIN WALLET SURVEILLANCE ENGINE ---
async function checkPulseChain(address) {
    try {
        const endpoints = [
            `https://api.scan.pulsechain.com/api/v2/addresses/${address}/transactions`,
            `https://scan.pulsechain.com/api/v2/addresses/${address}/transactions`
        ];

        let data = null;
        for (const url of endpoints) {
            try {
                const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } });
                if (!response.ok) continue;
                const json = await response.json();
                if (json && json.items) { data = json; break; }
            } catch (err) {}
        }

        if (!data || !data.items || data.items.length === 0) return;

        const latestTx = data.items[0];
        
        // Boot initialization
        if (!memoryState.pulsechain[address]) {
            memoryState.pulsechain[address] = latestTx.hash;
            return;
        }

        if (latestTx.hash !== memoryState.pulsechain[address]) {
            memoryState.pulsechain[address] = latestTx.hash;

            const isOutgoing = latestTx.from && latestTx.from.hash && latestTx.from.hash.toLowerCase() === address.toLowerCase();
            const direction = isOutgoing ? "🔴 OUTBOUND" : "🟢 INBOUND";
            
            // Resolve Names
            const fromName = resolveAddressName(latestTx.from?.hash);
            const toName = resolveAddressName(latestTx.to?.hash);
            
            let valueStr = "0";
            if (latestTx.value) valueStr = (parseFloat(latestTx.value) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});

            let feeStr = "Unknown";
            if (latestTx.fee && latestTx.fee.value) feeStr = (parseFloat(latestTx.fee.value) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});

            const method = latestTx.method || "Transfer";

            const msg = `🚨 <b>ON-CHAIN INTERCEPT</b> 🚨\n\n` +
                        `<b>Network:</b> PULSECHAIN 🟢\n` +
                        `<b>Action:</b> ${direction}\n` +
                        `<b>From:</b> <code>${fromName}</code>\n` +
                        `<b>To:</b> <code>${toName}</code>\n` +
                        `<b>Method:</b> ${method}\n` +
                        `<b>Value:</b> ${valueStr} PLS\n` +
                        `<b>Fee:</b> ${feeStr} PLS\n` +
                        `<b>Block:</b> ${latestTx.block}\n\n` +
                        `<a href="https://scan.pulsechain.com/tx/${latestTx.hash}">[ View on PulseScan ]</a>`;

            if (process.env.TELEGRAM_CHAT_ID) {
                bot.sendMessage(process.env.TELEGRAM_CHAT_ID, msg, { parse_mode: 'HTML', disable_web_page_preview: true }).catch(()=>{});
            }
        }
    } catch (e) {}
}

async function checkEthereum(address) {
    if (!process.env.ETHERSCAN_API_KEY) return;
    try {
        const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&page=1&offset=1&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`;
        const response = await fetch(url);
        const json = await response.json();
        
        if (json.status !== "1" || !json.result || json.result.length === 0) return;

        const latestTx = json.result[0];

        // Boot initialization
        if (!memoryState.ethereum[address]) {
            memoryState.ethereum[address] = latestTx.hash;
            return;
        }

        if (latestTx.hash !== memoryState.ethereum[address]) {
            memoryState.ethereum[address] = latestTx.hash;

            const isOutgoing = latestTx.from.toLowerCase() === address.toLowerCase();
            const direction = isOutgoing ? "🔴 OUTBOUND" : "🟢 INBOUND";
            
            // Resolve Names
            const fromName = resolveAddressName(latestTx.from);
            const toName = resolveAddressName(latestTx.to);
            
            let valueStr = "0";
            if (latestTx.value) valueStr = (parseFloat(latestTx.value) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});
            
            let feeStr = "Unknown";
            if (latestTx.gasUsed && latestTx.gasPrice) {
                const feeWei = parseFloat(latestTx.gasUsed) * parseFloat(latestTx.gasPrice);
                feeStr = (feeWei / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});
            }

            const method = latestTx.functionName ? latestTx.functionName.split('(')[0] : "Transfer";

            const msg = `🚨 <b>ON-CHAIN INTERCEPT</b> 🚨\n\n` +
                        `<b>Network:</b> ETHEREUM 🔵\n` +
                        `<b>Action:</b> ${direction}\n` +
                        `<b>From:</b> <code>${fromName}</code>\n` +
                        `<b>To:</b> <code>${toName}</code>\n` +
                        `<b>Method:</b> ${method}\n` +
                        `<b>Value:</b> ${valueStr} ETH\n` +
                        `<b>Fee:</b> ${feeStr} ETH\n` +
                        `<b>Block:</b> ${latestTx.blockNumber}\n\n` +
                        `<a href="https://etherscan.io/tx/${latestTx.hash}">[ View on Etherscan ]</a>`;

            if (process.env.TELEGRAM_CHAT_ID) {
                bot.sendMessage(process.env.TELEGRAM_CHAT_ID, msg, { parse_mode: 'HTML', disable_web_page_preview: true }).catch(()=>{});
            }
        }
    } catch (e) {}
}

async function runSurveillanceCycle() {
    console.log(`[${new Date().toISOString()}] SURVEILLANCE: Sweeping ${TARGET_ADDRESSES.length} core wallets on PulseChain & Ethereum...`);
    
    for (const address of TARGET_ADDRESSES) {
        await checkPulseChain(address);
        await checkEthereum(address);
        
        // 300ms pause between wallets to respect Free-Tier 5 req/sec limit
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// Sweep all 25 wallets every 90 seconds
setInterval(runSurveillanceCycle, 90000);
// Trigger initial sweep 5 seconds after boot
setTimeout(runSurveillanceCycle, 5000);
