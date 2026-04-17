const { Client } = require('discord.js-selfbot-v13');

const client = new Client();

// ─────────────────────────────────────────
//  ⚙️  CONFIG
// ─────────────────────────────────────────
const TOKEN       = process.env.TOKEN;
const DRAFTBOT_ID = process.env.DRAFTBOT_ID;

const CLASSEMENTS = [
    {
        nom: "Argent",
        commande: "topargent",
        channelId: process.env.CHANNEL_ARGENT || "1494459873738489899",
        emoji: "💰",
    },
    {
        nom: "XP",
        commande: "topniveau",
        channelId: process.env.CHANNEL_XP || "1494094939821441057",
        emoji: "🧪",
    }
];

const REFRESH_INTERVAL_MS  = 3_600_000;  // 1 heure
const WAIT_FOR_RESPONSE_MS = 6_000;       // attente réponse DraftBot
// ─────────────────────────────────────────

const lastMessages = {};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function timestamp() {
    return new Date().toLocaleTimeString('fr-FR');
}

async function refreshClassement(classement) {
    console.log(`[${timestamp()}] 🔄 Refresh ${classement.nom}...`);

    const channel = await client.channels.fetch(classement.channelId);
    if (!channel) {
        console.error(`❌ Salon introuvable pour ${classement.nom} !`);
        return;
    }

    // 1️⃣ Exécute la slash command avec top 10
    try {
        await channel.sendSlash(DRAFTBOT_ID, classement.commande, 10);
        console.log(`[${timestamp()}] ✅ Slash /${classement.commande} envoyée`);
    } catch (e) {
        console.error(`[${timestamp()}] ❌ Erreur slash ${classement.commande} :`, e.message);
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
                msg.embeds[0].title?.toLowerCase().includes("classement") ||
                msg.embeds[0].title?.toLowerCase().includes("niveau") ||
                msg.embeds[0].title?.toLowerCase().includes("xp")
            )
        )
        .first();

    if (!draftMsg) {
        console.warn(`[${timestamp()}] ⚠️  Pas de réponse DraftBot pour ${classement.nom}`);
        return;
    }

    // 4️⃣ Supprime l'ancien message reposté
    if (lastMessages[classement.nom]?.bot) {
        try { await lastMessages[classement.nom].bot.delete(); } catch (_) {}
    }

    // 5️⃣ Supprime le message de DraftBot
    if (lastMessages[classement.nom]?.draft) {
        try { await lastMessages[classement.nom].draft.delete(); } catch (_) {}
    }

    // Calcule le prochain refresh
    const prochainRefresh = Math.floor((Date.now() + REFRESH_INTERVAL_MS) / 1000);

    // 6️⃣ Reposte l'embed avec le texte
    const newMsg = await channel.send({
        content: `${classement.emoji} **Classement ${classement.nom}** — Mis à jour <t:${Math.floor(Date.now() / 1000)}:R> • Prochain refresh <t:${prochainRefresh}:R>`,
        embeds: draftMsg.embeds,
    });

    lastMessages[classement.nom] = { bot: newMsg, draft: draftMsg };
    console.log(`[${timestamp()}] ✅ ${classement.nom} posté !`);
}

async function refreshTout() {
    for (const classement of CLASSEMENTS) {
        await refreshClassement(classement);
        await sleep(3000);
    }
}

process.on('unhandledRejection', (err) => {
    console.error(`[${timestamp()}] ⚠️  Erreur non gérée :`, err.message);
});

client.on('ready', async () => {
    console.log(`\n🤖 Connecté en tant que ${client.user.tag}`);
    console.log(`⏱️  Intervalle : ${REFRESH_INTERVAL_MS / 60000} minutes\n`);

    await refreshTout();
    setInterval(refreshTout, REFRESH_INTERVAL_MS);
});

client.login(TOKEN);