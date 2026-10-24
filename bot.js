// Safe dotenv check: loads locally if present, ignores silently on Railway
try { require('dotenv').config(); } catch (e) {}

const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');
const parser = new Parser();

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("FATAL ERROR: TELEGRAM_BOT_TOKEN is not defined in environment variables.");
    process.exit(1);
}

// Request chat_member updates explicitly in polling
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: {
        params: {
            allowed_updates: ["message", "edited_message", "chat_member"]
        }
    } 
});

// --- 1. TARGET SURVEILLANCE LIST (Wallets to Watch) ---
const ADDRESS_BOOK = {
    '0xb8698cfffdaaf26ca21fe8aa560c18cc2b2f5996': '5996 ROOT (operates Maker) [T1]',
    '0xaf10cc6c50defff901b535691550d7af208939c5': 'GOD WHALE 1 [T1]',
    '0x2bde3b9c0129be4689e245ba689b9b0ae4ac666d': 'GOD WHALE 2 [T1]',
    '0xf1bd8e36a0e48650bdb28056277b05e851ebbae8': 'GOD WHALE 3 [T1]',
    '0x828fd91d3e3a9ffa6305e78b9ae2cfbc5b5d9f6b': 'GOD WHALE 4 [T1]',
    '0x1706d193862da7f8c746aae63d514df93dfa5dbf': 'GOD WHALE 5 [T1]',
    '0xddf744374b46aa980ddce4a5aa216478bf925cd1': 'GOD WHALE 6 [T1]',
    '0x2fd56159f4c8664a1de5c75e430338cfa58cd5b9': 'GOD WHALE 7 [T1]',
    '0x807dc01d44407d3efa0171f6de39076a27f20338': 'GOD WHALE 8 [T1]',
    '0x3930f94249a66535bc0f177bc567152320dd7e6c': 'GOD WHALE 9 [T1]',
    '0x41b20fbb9e38abeaef31fa45a9b760d251180a5b': 'GOD WHALE 10 [T1]',
    '0xf5d7b1b20288b9052e9cbdbf877a19077edb34d8': 'GOD WHALE 11 [T1]',
    '0xab3c13e0ea435aa388ea4e7bfa7baecc283c92ee': 'HEX WHALE 1 [T1]',
    '0x1e57ce7e4bcc06f4cfdb7572acb6335ba670920e': 'HEX WHALE 2 [T1]',
    '0xe059d3e762b11764597225e4c08c7606a16caccc': 'HEX WHALE 3 [T1]',
    '0x5f2c9a4d47cab74bfc35d5d9cb391687049d8503': 'RACKHAM 1 [T1]',
    '0x55f983db44b494218ad8288ce02636674c5f9be5': 'RACKHAM 2 [T1]',
    '0x075e72a5edf65f0a5f44699c7654c1a76941ddc8': 'OA 1 [T1]',
    '0xa2e1734682c6a237c070d93019a7e0bf7047406c': 'OA 2 [T1]',
    '0x25b313158ce11080524dca0fd01141eed5f94b81': 'OA 3 [T1]',
    '0x2d2c2ff3345de305ea06c35c958b0a4fd774abda': 'OA 4 [T1]',
    '0x9a6a414d6f3497c05e3b1de90520765fa1e07c03': 'OA 5 (HEX OA) [T1]',
    '0x4bdbb75f1995f966dbf79e7433424a94845dba00': 'OA 6 [T1]',
    '0xbb5cbbf47f1a1741195c128c4d00457a4501c177': 'OA 7 [T1]',
    '0x65a8875862263219d5f230f69385397a88247355': 'OA 8 [T1]'
};

// Built-in Ecosystem Contract Directory
const KNOWN_CONTRACTS = {
    '0x98bf93ebf5c380c0e6ae8e192a7e2ae08edacc02': 'PulseX Router V1',
    '0x165c3410fc91ef562c50559f7d2289febed552d9': 'PulseX Router V2',
    '0xda9aba4eecf53b1c7b9b2672d6c2b0d2c9d53e04': 'PulseXSwapRouter',
    '0xa1077a294dde1b09bb078844df40758a5d0f9a27': 'WPLS',
    '0x95b303987a60c71504d99aa1b13b4da07b0790ab': 'PLSX',
    '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39': 'HEX',
    '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d': 'INC',
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI / pDAI',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': 'Maker (MKR)',
    '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b': 'Maker: Vat (Core)',
    '0x19c0976f590d67707e62397c87829d896dc0f1f1': 'Maker: Pot (DSR)',
    '0x1715a3e4a142d8b698131108995174f37aeba10d': 'PulseChain Bridge',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'OmniBridge'
};

const TARGET_ADDRESSES = Object.keys(ADDRESS_BOOK);

let memoryState = {
    pulsechain: {},
    ethereum: {}
};

function formatEntityForFlow(entityInput) {
    if (!entityInput) return "unknown";
    const addressStr = typeof entityInput === 'string' ? entityInput : entityInput.hash;
    if (!addressStr) return "unknown";
    const lower = addressStr.toLowerCase();

    if (ADDRESS_BOOK[lower]) {
        return ADDRESS_BOOK[lower].replace(/\s*\[T\d+\]$/i, '');
    }
    if (KNOWN_CONTRACTS[lower]) {
        return `${KNOWN_CONTRACTS[lower]} (${lower.substring(0, 8)}..)`;
    }
    if (typeof entityInput === 'object') {
        if (entityInput.token && entityInput.token.symbol) {
            return `${entityInput.token.symbol} Token (${lower.substring(0, 8)}..)`;
        }
        if (entityInput.name) {
            return `${entityInput.name} (${lower.substring(0, 8)}..)`;
        }
    }
    return `${lower.substring(0, 10)}..`;
}

function formatTimeAgo(dateInput) {
    if (!dateInput) return "Unknown";
    const timestampMs = typeof dateInput === 'number' ? dateInput * 1000 : new Date(dateInput).getTime();
    const diffMs = Date.now() - timestampMs;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

async function fetchEthBalance(address) {
    const apiKey = process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY.trim() : '';
    if (apiKey) {
        try {
            const v2Url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
            const res = await fetch(v2Url);
            const json = await res.json();
            if (json.status === "1" && json.result) {
                return (parseFloat(json.result) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});
            }
        } catch (e) {}
    }
    const rpcUrls = ['https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com', 'https://rpc.ankr.com/eth'];
    for (const rpc of rpcUrls) {
        try {
            const rpcRes = await fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1 })
            });
            const rpcJson = await rpcRes.json();
            if (rpcJson && rpcJson.result) {
                const wei = BigInt(rpcJson.result);
                return (Number(wei) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});
            }
        } catch (e) {}
    }
    return "0.0000";
}

console.log(`[${new Date().toISOString()}] TEH OPERATOR // SYSTEM BOOTING...`);
console.log(`[SYS] Loaded ${TARGET_ADDRESSES.length} target wallets into surveillance mesh.`);

if (process.env.TELEGRAM_CHAT_ID) {
    bot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
        `<code>[ TEH OPERATOR // SYSTEM ONLINE ]</code>\n\n<i>Live OSINT wire synchronized. Monitoring global data streams...</i>`, 
        { parse_mode: 'HTML' }
    ).catch(() => {});
}

bot.setMyCommands([
    { command: '/scan', description: 'Force real-time OSINT scan for breaking developments' },
    { command: '/dossier', description: 'Query target ledger metadata (/dossier <name>)' },
    { command: '/wallets', description: 'Inspect full surveillance entity directory' },
    { command: '/price', description: 'Check live PulseChain ecosystem telemetry' },
    { command: '/help', description: 'Display available surveillance directives' }
]).catch(() => {});

// Helper function to send vanishing welcome greeting
function sendVanishingWelcome(chatId, userName) {
    bot.sendMessage(chatId, 
        `👁 <b>SUBJECT IDENTIFIED</b>\n\n` +
        `Welcome to TeH GAME, <b>${userName}</b>.\n\n` +
        `Your Consumer Recreation Services profile has been activated. Every transaction leaves a trace. Every belief has a ledger.\n\n` +
        `<code>Directive: Type /help or /website to inspect the archive.</code>`,
        { parse_mode: 'HTML' }
    ).then((sentMsg) => {
        setTimeout(() => {
            bot.deleteMessage(chatId, sentMsg.message_id).catch(() => {});
        }, 30000); 
    }).catch(() => {});
}

// --- 3. WELCOME PROTOCOL ---
bot.on('chat_member', (update) => {
    const oldStatus = update.old_chat_member?.status;
    const newStatus = update.new_chat_member?.status;
    const user = update.new_chat_member?.user;

    if ((oldStatus === 'left' || oldStatus === 'kicked') && newStatus === 'member') {
        if (user && !user.is_bot) {
            sendVanishingWelcome(update.chat.id, user.first_name || "Subject");
        }
    }
});

bot.on('new_chat_members', (msg) => {
    const newMembers = msg.new_chat_members || [];
    newMembers.forEach((member) => {
        if (!member.is_bot) {
            sendVanishingWelcome(msg.chat.id, member.first_name || "Subject");
        }
    });
});

// --- 4. TELEGRAM COMMANDS (Using strict ^ regex to prevent URL overlaps) ---

bot.onText(/^\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `<code>[ SYSTEM READY // DIRECTIVES ACTIVE ]</code>\n\nUse /scan for live wire, /dossier <name> to check a target, or /wallets for the directory.`, { parse_mode: 'HTML' });
});

bot.onText(/^\/website/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `🌐 <b>CENTRAL INVESTIGATION ARCHIVE</b>\n\n🔗 <a href="https://tehgame.xyz">https://tehgame.xyz</a>\n\n<i>"What if teh game has already started, and you just haven't noticed?"</i>`, 
        { parse_mode: 'HTML', disable_web_page_preview: false });
});

bot.onText(/^\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `<code>[ AVAILABLE PROTOCOLS ]</code>\n\n• <b>/website</b> - Primary dossier\n• <b>/scan</b> - Global intelligence news scan\n• <b>/dossier &lt;name&gt;</b> - Inspect specific target wallet\n• <b>/wallets</b> - List all tracked surveillance targets\n• <b>/price</b> - PulseChain DEX telemetry`, 
        { parse_mode: 'HTML' });
});

bot.onText(/^\/wallets/, (msg) => {
    let listMsg = `📁 <b>SURVEILLANCE ENTITY DIRECTORY</b>\n\n`;
    let categories = {
        "Root / Maker": ['5996 ROOT (operates Maker) [T1]'],
        "God Whales": Object.values(ADDRESS_BOOK).filter(name => name.startsWith('GOD WHALE')),
        "HEX Whales": Object.values(ADDRESS_BOOK).filter(name => name.startsWith('HEX WHALE')),
        "Rackham": Object.values(ADDRESS_BOOK).filter(name => name.startsWith('RACKHAM')),
        "Origin Addresses (OA)": Object.values(ADDRESS_BOOK).filter(name => name.startsWith('OA'))
    };

    for (const [cat, names] of Object.entries(categories)) {
        if (names.length > 0) {
            listMsg += `🔹 <b>${cat}:</b>\n`;
            names.forEach(n => { listMsg += `• ${n}\n`; });
            listMsg += `\n`;
        }
    }
    listMsg += `<i>Use /dossier &lt;Name&gt; to pull real-time balances.</i>`;
    bot.sendMessage(msg.chat.id, listMsg, { parse_mode: 'HTML' });
});

// Fix dossier so it properly captures the query even with the new anchor
bot.onText(/^\/dossier(?:@\w+)?(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1] ? match[1].trim().toLowerCase() : '';

    if (!query) {
        return bot.sendMessage(chatId, `⚠️ <i>Usage error. Specify a target designation (e.g., /dossier 5996).</i>`, { parse_mode: 'HTML' });
    }

    let targetAddress = null;
    let targetName = "CUSTOM TARGET";

    for (const [addr, name] of Object.entries(ADDRESS_BOOK)) {
        if (name.toLowerCase().includes(query) || addr.toLowerCase() === query) {
            targetAddress = addr;
            targetName = name;
            break;
        }
    }

    if (!targetAddress) {
        return bot.sendMessage(chatId, `⚠️ <i>Target designation not found in surveillance ledger. Use /wallets to review active entities.</i>`, { parse_mode: 'HTML' });
    }

    bot.sendMessage(chatId, `<code>[ QUERYING LEDGER FOR ${targetName}... ]</code>`, { parse_mode: 'HTML' });

    try {
        let plsBalance = "0.00";
        let lastFootprint = "No recent on-chain activity";
        try {
            const plsRes = await fetch(`https://api.scan.pulsechain.com/api/v2/addresses/${targetAddress}`);
            const plsJson = await plsRes.json();
            if (plsJson && plsJson.coin_balance) {
                plsBalance = (parseFloat(plsJson.coin_balance) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 2});
            }

            const txRes = await fetch(`https://api.scan.pulsechain.com/api/v2/addresses/${targetAddress}/transactions`);
            const txJson = await txRes.json();
            if (txJson && txJson.items && txJson.items.length > 0) {
                const latest = txJson.items[0];
                const isOut = latest.from?.hash?.toLowerCase() === targetAddress.toLowerCase();
                const dir = isOut ? "Outbound" : "Inbound";
                const method = latest.method || "transfer";
                const otherParty = isOut ? formatEntityForFlow(latest.to) : formatEntityForFlow(latest.from);
                lastFootprint = `${formatTimeAgo(latest.timestamp)} (${dir} ${method} → ${otherParty})`;
            }
        } catch (e) {}

        const ethBalance = await fetchEthBalance(targetAddress);

        const dossierMsg = `📁 <b>TARGET DOSSIER GENERATED</b>\n\n` +
                           `<b>Designation:</b> ${targetName}\n` +
                           `<code>${targetAddress}</code>\n\n` +
                           `🟢 <b>PulseChain Reserves:</b> ${plsBalance} PLS\n` +
                           `🔵 <b>Ethereum Reserves:</b> ${ethBalance} ETH\n\n` +
                           `<b>Operational Status:</b> ACTIVE (Monitored Dual-Chain)\n` +
                           `<b>Last Footprint:</b> ${lastFootprint}\n\n` +
                           `<a href="https://otter.pulsechain.com/address/${targetAddress}">[ OtterScan ]</a> • <a href="https://etherscan.io/address/${targetAddress}">[ Etherscan ]</a>\n\n` +
                           `<code>[ End of Intercept ]</code>`;

        bot.sendMessage(chatId, dossierMsg, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (err) {
        bot.sendMessage(chatId, `⚠️ <i>Ledger query severed. Target telemetry unavailable.</i>`, { parse_mode: 'HTML' });
    }
});

bot.onText(/^\/price/, async (msg) => {
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

bot.onText(/^\/scan/, async (msg) => {
    bot.sendMessage(msg.chat.id, `<code>[ 📡 SCANNING LIVE WEB... ]</code>`, { parse_mode: 'HTML' });
    try {
        const query = encodeURIComponent('"Richard Heart" OR PulseChain OR "HEX crypto"');
        const rssUrl = `https://www.bing.com/news/search?q=${query}&format=rss`;
        
        const response = await fetch(rssUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });

        if (!response.ok) throw new Error(`HTTP Fetch failed`);

        const xmlData = await response.text();
        const feed = await parser.parseString(xmlData);
        const items = feed.items || [];
        
        if (items.length === 0) return bot.sendMessage(msg.chat.id, `<i>No recent dispatches returned.</i>`, { parse_mode: 'HTML' });
        
        let message = `🛰 <b>INTELLIGENCE WIRE</b>\n\n`;
        items.slice(0, 3).forEach(art => { 
            const pubDate = art.pubDate ? new Date(art.pubDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
            message += `• <a href="${art.link}"><b>${art.title}</b></a>\n  <i>${pubDate}</i>\n\n`; 
        });
        
        bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (e) {
        console.error("Scan Error:", e.message);
        bot.sendMessage(msg.chat.id, `⚠️ <i>Wire scan failed (Target actively blocking scrape).</i>`, { parse_mode: 'HTML' });
    }
});

// --- 5. MULTI-CHAIN SURVEILLANCE ENGINE ---
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
        
        if (!memoryState.pulsechain[address]) {
            memoryState.pulsechain[address] = latestTx.hash;
            return;
        }

        if (latestTx.hash !== memoryState.pulsechain[address]) {
            memoryState.pulsechain[address] = latestTx.hash;

            const isOutgoing = latestTx.from && latestTx.from.hash && latestTx.from.hash.toLowerCase() === address.toLowerCase();
            const statusEmoji = isOutgoing ? '🔴' : '🟢';
            const targetHeader = ADDRESS_BOOK[address.toLowerCase()] || address;

            const fnName = latestTx.method ? latestTx.method : "transfer";
            
            const nativeValue = latestTx.value ? parseFloat(latestTx.value) / 1e18 : 0;
            let valDisplay = `${nativeValue.toLocaleString(undefined, {maximumFractionDigits: 4})} PLS`;

            if (nativeValue === 0 && latestTx.token_transfers && latestTx.token_transfers.length > 0) {
                const tt = latestTx.token_transfers[0];
                if (tt.token && tt.total) {
                    const dec = parseInt(tt.token.decimals || "18");
                    const sym = tt.token.symbol || "Tokens";
                    const tokenVal = parseFloat(tt.total.value || "0") / Math.pow(10, dec);
                    valDisplay = `${tokenVal.toLocaleString(undefined, {maximumFractionDigits: 2})} ${sym}`;
                }
            }

            const fromEntity = formatEntityForFlow(latestTx.from);
            const toEntity = formatEntityForFlow(latestTx.to);

            const msg = `${statusEmoji} <b>${targetHeader}</b>\n` +
                        `fn: ${fnName}  val: ${valDisplay}\n` +
                        `from ${fromEntity} → to ${toEntity}\n` +
                        `https://otter.pulsechain.com/tx/${latestTx.hash}`;

            if (process.env.TELEGRAM_CHAT_ID) {
                bot.sendMessage(process.env.TELEGRAM_CHAT_ID, msg, { parse_mode: 'HTML', disable_web_page_preview: true }).catch(()=>{});
            }
        }
    } catch (e) {}
}

async function checkEthereum(address) {
    if (!process.env.ETHERSCAN_API_KEY) return;
    const apiKey = process.env.ETHERSCAN_API_KEY.trim();
    try {
        const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&page=1&offset=1&sort=desc&apikey=${apiKey}`;
        const response = await fetch(url);
        const json = await response.json();
        
        if (json.status !== "1" || !Array.isArray(json.result) || json.result.length === 0) return;

        const latestTx = json.result[0];

        if (!memoryState.ethereum[address]) {
            memoryState.ethereum[address] = latestTx.hash;
            return;
        }

        if (latestTx.hash !== memoryState.ethereum[address]) {
            memoryState.ethereum[address] = latestTx.hash;

            const isOutgoing = latestTx.from.toLowerCase() === address.toLowerCase();
            const statusEmoji = isOutgoing ? '🔴' : '🟢';
            const targetHeader = ADDRESS_BOOK[address.toLowerCase()] || address;

            let fnName = latestTx.functionName ? latestTx.functionName.split('(')[0] : "transfer";
            if (!fnName) fnName = "transfer";

            const nativeValue = latestTx.value ? parseFloat(latestTx.value) / 1e18 : 0;
            const valDisplay = `${nativeValue.toLocaleString(undefined, {maximumFractionDigits: 4})} ETH`;

            const fromEntity = formatEntityForFlow(latestTx.from);
            const toEntity = formatEntityForFlow(latestTx.to);

            const msg = `${statusEmoji} <b>${targetHeader} [ETH]</b>\n` +
                        `fn: ${fnName}  val: ${valDisplay}\n` +
                        `from ${fromEntity} → to ${toEntity}\n` +
                        `https://etherscan.io/tx/${latestTx.hash}`;

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
        await new Promise(resolve => setTimeout(resolve, 350));
    }
}

setInterval(runSurveillanceCycle, 90000);
setTimeout(runSurveillanceCycle, 5000);
