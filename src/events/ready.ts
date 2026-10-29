import { Events, Client, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

const INSTANCE_ID = Math.random().toString(36).substring(2, 7).toUpperCase();

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        console.log(`[READY] Logged in as ${client.user?.tag} (PID: ${process.pid}, Instance: ${INSTANCE_ID})`);
        console.log(`[READY] Bot is ready and running.`);

        // Durum kontrolü için log kanalına tekil bilgi düş
        try {
            const logChannel = client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
            if (logChannel) {
                const readyEmbed = new EmbedBuilder()
                    .setTitle('🟢 Bot Sistemi Çevrimiçi')
                    .setColor('#00FF00')
                    .setDescription(`**Bot:** ${client.user?.tag}\n**Instance ID:** \`${INSTANCE_ID}\`\n**Süreç (PID):** \`${process.pid}\``)
                    .setFooter({ text: 'Not: Eğer bu mesaj bot başlarken 2 kere gelirse, Render/sunucu üzerinde 2 ayrı bot servisi çalışıyor demektir.' })
                    .setTimestamp();
                await logChannel.send({ embeds: [readyEmbed] }).catch(() => null);
            }
        } catch {}
    },
};
