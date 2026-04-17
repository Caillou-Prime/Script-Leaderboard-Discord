const { Client } = require('discord.js-selfbot-v13');

const client = new Client();

// ─────────────────────────────────────────
//  ⚙️  CONFIG
// ─────────────────────────────────────────
const TOKEN           = process.env.TOKEN;
const CHANNEL_ID      = process.env.CHANNEL_ID || "1494459873738489899";
const DRAFTBOT_ID     = process.env.DRAFTBOT_ID;

const REFRESH_INTERVAL_MS  = 3_600_000;  // 1 heure
const WAIT_FOR_RESPONSE_MS = 6_000;       // attente réponse DraftBot
// ─────────────────────────────────────────

let lastBotMessage   = null;
let lastDraftMessage = null;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function timestamp() {
    return new Date().toLocaleTimeString('fr-FR');
}

async function refreshClassement() {
    console.log(`[${timestamp()}] 🔄 Refresh classement...`);

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
        console.error("❌ Salon introuvable !");
        return;
    }

    // 1️⃣ Exécute /topargent avec option top 10
    try {
        await channel.sendSlash(DRAFTBOT_ID, 'topargent', 10);
        console.log(`[${timestamp()}] ✅ Slash command envoyée`);
    } catch (e) {
        console.error(`[${timestamp()}] ❌ Erreur envoi slash :`, e.message);
        return;
    }

    // 2️⃣ Attend que DraftBot réponde
    await sleep(WAIT_FOR_RESPONSE_MS);

    // 3️⃣ Récupère les derniers messages
    const messages = await channel.messages.fetch({ limit: 15 });

    const draftMsg = messages
        .filter(msg =>
            msg.author.id === DRAFTBOT_ID &&
            msg.embeds.length > 0 &&
            (
                msg.embeds[0].title?.toLowerCase().includes("argent") ||
                msg.embeds[0].title?.toLowerCase().includes("économie") ||
                msg.embeds[0].title?.toLowerCase().includes("classement")
            )
        )
        .first();

    if (!draftMsg) {
        console.warn(`[${timestamp()}] ⚠️  Pas de réponse DraftBot trouvée`);
        return;
    }

    // 4️⃣ Supprime l'ancien message reposté
    if (lastBotMessage) {
        try { await lastBotMessage.delete(); } catch (_) {}
    }

    // 5️⃣ Supprime le message de DraftBot
    if (lastDraftMessage) {
        try { await lastDraftMessage.delete(); } catch (_) {}
    }
    lastDraftMessage = draftMsg;

    // 6️⃣ Reposte l'embed
    lastBotMessage = await channel.send({
        content: `💰 **Classement Argent** — Mis à jour <t:${Math.floor(Date.now() / 1000)}:R>`,
        embeds: draftMsg.embeds,
    });

    console.log(`[${timestamp()}] ✅ Classement posté !`);
}

// Gestion des erreurs pour éviter les crashs
process.on('unhandledRejection', (err) => {
    console.error(`[${timestamp()}] ⚠️  Erreur non gérée :`, err.message);
});

client.on('ready', async () => {
    console.log(`\n🤖 Connecté en tant que ${client.user.tag}`);
    console.log(`📡 Salon cible : ${CHANNEL_ID}`);
    console.log(`⏱️  Intervalle : ${REFRESH_INTERVAL_MS / 60000} minutes\n`);

    await refreshClassement();
    setInterval(refreshClassement, REFRESH_INTERVAL_MS);
});

client.login(TOKEN);
