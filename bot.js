// Safe dotenv check: loads locally if present, ignores silently on Railway
try { require('dotenv').config(); } catch (e) {}

const TelegramBot = require('node-telegram-bot-api');
const Parser = require('rss-parser');
const parser = new Parser();

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("FATAL ERROR: TELEGRAM_BOT_TOKEN is not defined in environment variables.");
    process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// --- 1. INTELLIGENCE ADDRESS BOOK ---
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

let memoryState = {
    pulsechain: {},
    ethereum: {}
};

function resolveAddressName(addressStr) {
    if (!addressStr) return "UNKNOWN CONTRACT";
    const lower = addressStr.toLowerCase();
    if (ADDRESS_BOOK[lower]) return ADDRESS_BOOK[lower];
    return "UNIDENTIFIED WALLET";
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

// Helper: Fetch ETH Balance using Etherscan V2 API -> V1 API -> Public RPC
async function fetchEthBalance(address) {
    const apiKey = process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY.trim() : '';
    
    if (apiKey) {
        // 1. Try Etherscan V2 API
        try {
            const v2Url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
            const res = await fetch(v2Url);
            const json = await res.json();
            if (json.status === "1" && json.result) {
                return (parseFloat(json.result) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});
            }
        } catch (e) {}

        // 2. Try Etherscan V1 API fallback
        try {
            const v1Url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
            const res = await fetch(v1Url);
            const json = await res.json();
            if (json.status === "1" && json.result) {
                return (parseFloat(json.result) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});
            }
        } catch (e) {}
    }

    // 3. Fallback to direct Ethereum RPC if Etherscan rate-limits (5 req/sec)
    const rpcUrls = ['https://eth.llamarpc.com', 'https://ethereum-rpc.publicnode.com', 'https://rpc.ankr.com/eth'];
    for (const rpc of rpcUrls) {
        try {
            const rpcRes = await fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_getBalance',
                    params: [address, 'latest'],
                    id: 1
                })
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

// Console Logs
console.log(`[${new Date().toISOString()}] TEH OPERATOR // SYSTEM BOOTING...`);
console.log(`[SYS] Loaded ${TARGET_ADDRESSES.length} target wallets into surveillance mesh.`);

// Send System Online message to Telegram Chat on Startup
if (process.env.TELEGRAM_CHAT_ID) {
    bot.sendMessage(process.env.TELEGRAM_CHAT_ID, 
        `<code>[ TEH OPERATOR // SYSTEM ONLINE ]</code>\n\n<i>Live OSINT wire synchronized. Monitoring global data streams...</i>`, 
        { parse_mode: 'HTML' }
    ).catch(() => {});
}

// --- 2. COMMAND MENU ---
bot.setMyCommands([
    { command: '/scan', description: 'Force real-time OSINT scan for breaking developments' },
    { command: '/dossier', description: 'Query target ledger metadata (/dossier <name>)' },
    { command: '/wallets', description: 'Inspect full surveillance entity directory' },
    { command: '/price', description: 'Check live PulseChain ecosystem telemetry' },
    { command: '/help', description: 'Display available surveillance directives' }
]).catch(() => {});

// --- 3. WELCOME PROTOCOL (Auto-Delete 30s) ---
bot.on('new_chat_members', (msg) => {
    const newMembers = msg.new_chat_members;
    newMembers.forEach((member) => {
        if (member.is_bot) return;
        const name = member.first_name || "Subject";
        bot.sendMessage(msg.chat.id, 
            `👁 <b>SUBJECT IDENTIFIED</b>\n\n` +
            `Welcome to TeH GAME, <b>${name}</b>.\n\n` +
            `Your Consumer Recreation Services profile has been activated. Every transaction leaves a trace. Every belief has a ledger.\n\n` +
            `<code>Directive: Type /help or /website to inspect the archive.</code>`,
            { parse_mode: 'HTML' }
        ).then((sentMsg) => {
            setTimeout(() => {
                bot.deleteMessage(msg.chat.id, sentMsg.message_id).catch(() => {});
            }, 30000); 
        }).catch(() => {});
    });
});

// --- 4. TELEGRAM COMMANDS ---
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `<code>[ SYSTEM READY // DIRECTIVES ACTIVE ]</code>\n\nUse /scan for live wire, /dossier <name> to check a target, or /wallets for the directory.`, { parse_mode: 'HTML' });
});

bot.onText(/\/website/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `🌐 <b>CENTRAL INVESTIGATION ARCHIVE</b>\n\n🔗 <a href="https://tehgame.xyz">https://tehgame.xyz</a>\n\n<i>"What if teh game has already started, and you just haven't noticed?"</i>`, 
        { parse_mode: 'HTML', disable_web_page_preview: false });
});

bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `<code>[ AVAILABLE PROTOCOLS ]</code>\n\n• <b>/website</b> - Primary dossier\n• <b>/scan</b> - Global intelligence news scan\n• <b>/dossier &lt;name&gt;</b> - Inspect specific target wallet\n• <b>/wallets</b> - List all tracked surveillance targets\n• <b>/price</b> - PulseChain DEX telemetry`, 
        { parse_mode: 'HTML' });
});

// --- WALLET DIRECTORY COMMAND (/wallets) ---
bot.onText(/\/wallets/, (msg) => {
    let listMsg = `📁 <b>SURVEILLANCE ENTITY DIRECTORY</b>\n\n`;
    
    let categories = {
        "pDONG Hubs": ['pDONG WALLET', 'pDONG 2 WALLET'],
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

// --- DOSSIER QUERY COMMAND (/dossier) ---
bot.onText(/\/dossier(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1] ? match[1].trim().toLowerCase() : '';

    if (!query) {
        return bot.sendMessage(chatId, `⚠️ <i>Usage error. Specify a target designation (e.g., /dossier GOD WHALE 1 or /dossier pDONG WALLET).</i>`, { parse_mode: 'HTML' });
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
        // 1. Fetch PulseChain balance & last tx
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
                const method = latest.method || "Transfer";
                lastFootprint = `${formatTimeAgo(latest.timestamp)} (${dir} ${method} on PulseChain)`;
            }
        } catch (e) {}

        // 2. Fetch Ethereum balance via Etherscan V2 / RPC
        const ethBalance = await fetchEthBalance(targetAddress);

        const dossierMsg = `📁 <b>TARGET DOSSIER GENERATED</b>\n\n` +
                           `<b>Designation:</b> ${targetName}\n` +
                           `<code>${targetAddress}</code>\n\n` +
                           `🟢 <b>PulseChain Reserves:</b> ${plsBalance} PLS\n` +
                           `🔵 <b>Ethereum Reserves:</b> ${ethBalance} ETH\n\n` +
                           `<b>Operational Status:</b> ACTIVE (Monitored Dual-Chain)\n` +
                           `<b>Last Footprint:</b> ${lastFootprint}\n\n` +
                           `<a href="https://scan.pulsechain.com/address/${targetAddress}">[ PulseScan ]</a> • <a href="https://etherscan.io/address/${targetAddress}">[ Etherscan ]</a>\n\n` +
                           `<code>[ End of Intercept ]</code>`;

        bot.sendMessage(chatId, dossierMsg, { parse_mode: 'HTML', disable_web_page_preview: true });

    } catch (err) {
        bot.sendMessage(chatId, `⚠️ <i>Ledger query severed. Target telemetry unavailable.</i>`, { parse_mode: 'HTML' });
    }
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
        const feed = await parser.parseURL(rssUrl);
        const items = feed.items || [];
        
        if (items.length === 0) return bot.sendMessage(msg.chat.id, `<i>No recent dispatches returned.</i>`, { parse_mode: 'HTML' });
        
        let message = `🛰 <b>INTELLIGENCE WIRE</b>\n\n`;
        items.slice(0, 3).forEach(art => { 
            message += `• <a href="${art.link}"><b>${art.title}</b></a>\n  <i>${art.pubDate ? art.pubDate.substring(0,16) : 'Recent'}</i>\n\n`; 
        });
        
        bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (e) {
        console.error("Scan Error:", e);
        bot.sendMessage(msg.chat.id, `⚠️ <i>Wire scan failed.</i>`, { parse_mode: 'HTML' });
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
            const targetName = resolveAddressName(address);
            
            const counterpartyAddr = isOutgoing ? latestTx.to?.hash : latestTx.from?.hash;
            const counterpartyName = resolveAddressName(counterpartyAddr);
            const counterpartyFull = counterpartyAddr ? counterpartyAddr : "0x0000000000000000000000000000000000000000";
            
            const nativeValue = latestTx.value ? parseFloat(latestTx.value) / 1e18 : 0;
            const valueStr = nativeValue.toLocaleString(undefined, {maximumFractionDigits: 4});
            
            let feeStr = "Unknown";
            if (latestTx.fee && latestTx.fee.value) feeStr = (parseFloat(latestTx.fee.value) / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});

            let method = latestTx.method || "Transfer";
            
            let actionSummary = "";
            if (isOutgoing) {
                if (nativeValue > 0) actionSummary = `🔴 <b>Sent</b> ${valueStr} PLS <b>to</b> ${counterpartyName}`;
                else if (method.toLowerCase().includes('swap') || method.toLowerCase().includes('execute')) actionSummary = `🔄 <b>Swapped tokens via</b> ${counterpartyName}`;
                else actionSummary = `⚙️ <b>Executed ${method} on</b> ${counterpartyName}`;
            } else {
                if (nativeValue > 0) actionSummary = `🟢 <b>Received</b> ${valueStr} PLS <b>from</b> ${counterpartyName}`;
                else actionSummary = `📥 <b>Targeted by ${method} from</b> ${counterpartyName}`;
            }

            let tokenDetail = "";
            if (latestTx.token_transfers && latestTx.token_transfers.length > 0) {
                tokenDetail = `\n<b>Tokens Moved:</b>\n`;
                const transfers = latestTx.token_transfers.slice(0, 4);
                transfers.forEach(tt => {
                    if (tt.token && tt.total) {
                        const dec = parseInt(tt.token.decimals || "18");
                        const sym = tt.token.symbol || "Token";
                        const val = parseFloat(tt.total.value || "0") / Math.pow(10, dec);
                        tokenDetail += `• <code>${val.toLocaleString(undefined, {maximumFractionDigits: 2})} ${sym}</code>\n`;
                    }
                });
            }

            const msg = `🚨 <b>ON-CHAIN INTERCEPT</b> 🚨\n\n` +
                        `<b>Network:</b> PULSECHAIN 🟢\n` +
                        `<b>Target:</b> ${targetName}\n` +
                        `<code>${address}</code>\n\n` +
                        `${actionSummary}\n` +
                        `<code>${counterpartyFull}</code>\n` +
                        `${tokenDetail}\n` +
                        `<b>Network Fee:</b> ${feeStr} PLS\n` +
                        `<b>Block Height:</b> ${latestTx.block}\n\n` +
                        `<a href="https://scan.pulsechain.com/tx/${latestTx.hash}">[ View Forensic Trace on PulseScan ]</a>`;

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
        // Use Etherscan V2 API for Mainnet (chainid=1)
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
            const targetName = resolveAddressName(address);
            
            const counterpartyAddr = isOutgoing ? latestTx.to : latestTx.from;
            const counterpartyName = resolveAddressName(counterpartyAddr);
            const counterpartyFull = counterpartyAddr ? counterpartyAddr : "0x0000000000000000000000000000000000000000";
            
            const nativeValue = latestTx.value ? parseFloat(latestTx.value) / 1e18 : 0;
            const valueStr = nativeValue.toLocaleString(undefined, {maximumFractionDigits: 4});
            
            let feeStr = "Unknown";
            if (latestTx.gasUsed && latestTx.gasPrice) {
                const feeWei = parseFloat(latestTx.gasUsed) * parseFloat(latestTx.gasPrice);
                feeStr = (feeWei / 1e18).toLocaleString(undefined, {maximumFractionDigits: 4});
            }

            let method = latestTx.functionName ? latestTx.functionName.split('(')[0] : "Transfer";
            if (!method) method = "Transfer";

            let actionSummary = "";
            if (isOutgoing) {
                if (nativeValue > 0) actionSummary = `🔴 <b>Sent</b> ${valueStr} ETH <b>to</b> ${counterpartyName}`;
                else if (method.toLowerCase().includes('swap') || method.toLowerCase().includes('execute')) actionSummary = `🔄 <b>Swapped tokens via</b> ${counterpartyName}`;
                else actionSummary = `⚙️ <b>Executed ${method} on</b> ${counterpartyName}`;
            } else {
                if (nativeValue > 0) actionSummary = `🟢 <b>Received</b> ${valueStr} ETH <b>from</b> ${counterpartyName}`;
                else actionSummary = `📥 <b>Targeted by ${method} from</b> ${counterpartyName}`;
            }

            const msg = `🚨 <b>ON-CHAIN INTERCEPT</b> 🚨\n\n` +
                        `<b>Network:</b> ETHEREUM 🔵\n` +
                        `<b>Target:</b> ${targetName}\n` +
                        `<code>${address}</code>\n\n` +
                        `${actionSummary}\n` +
                        `<code>${counterpartyFull}</code>\n\n` +
                        `<b>Network Fee:</b> ${feeStr} ETH\n` +
                        `<b>Block Height:</b> ${latestTx.blockNumber}\n\n` +
                        `<a href="https://etherscan.io/tx/${latestTx.hash}">[ View Forensic Trace on Etherscan ]</a>`;

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
