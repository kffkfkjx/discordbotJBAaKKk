import { Events, Message, PartialMessage, EmbedBuilder, Client } from 'discord.js';
import { CONFIG } from '../config';
import { codeBlock, getSendableChannel } from '../utils';

// Mükerrer düzenleme loglarını engelleyen önbellek
const processedUpdates = new Map<string, number>();

setInterval(() => {
    const now = Date.now();
    for (const [key, time] of processedUpdates) {
        if (now - time > 60000) processedUpdates.delete(key);
    }
}, 5 * 60 * 1000);

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage, client: Client) {
        if (!newMessage.guild) return;

        // Yeni mesaj önbellekte değilse tam halini çek (author/content için)
        let fresh: Message | PartialMessage | null = newMessage;
        if (newMessage.partial) {
            fresh = await newMessage.fetch().catch(() => null);
            if (!fresh) return;
        }

        const author = fresh.author;
        if (!author || author.bot) return;

        // Link önizlemesi (embed) eklenmesi gibi düzenleme olmayan güncellemeleri yoksay
        if (!fresh.editedTimestamp) return;

        // Sadece içerik değiştiyse logla
        if (!oldMessage.partial && oldMessage.content === fresh.content) return;

        // 1. Process içi mükerrer log engeli
        const updateKey = `${fresh.id}:${fresh.content}`;
        const now = Date.now();
        const lastProcessed = processedUpdates.get(updateKey);
        if (lastProcessed && (now - lastProcessed < 30000)) {
            return;
        }
        processedUpdates.set(updateKey, now);

        const logChannel = getSendableChannel(client, CONFIG.CHANNELS.LOG_CHANNEL);
        if (!logChannel) return;

        // 2. Çift bot / çift instance engeli: Son 5 mesajda bu mesaj ID'si için düzenleme logu var mı kontrol et
        try {
            const recentMessages = await logChannel.messages.fetch({ limit: 5 }).catch(() => null);
            if (recentMessages) {
                const alreadyLogged = recentMessages.some((m: any) => 
                    m.embeds?.[0]?.title?.includes('Mesaj Düzenlendi') &&
                    m.embeds?.[0]?.fields?.some((f: any) => f.value?.includes(fresh.id)) &&
                    (now - m.createdTimestamp < 15000)
                );
                if (alreadyLogged) return;
            }
        } catch {}

        const embed = new EmbedBuilder()
            .setTitle('✏️ Mesaj Düzenlendi')
            .setColor('#FFAA00')
            .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() })
            .addFields(
                { name: 'Kanal', value: `<#${fresh.channelId}>`, inline: true },
                { name: 'Mesaja Git', value: `[Tıkla](${fresh.url})`, inline: true },
                { name: 'Eski İçerik', value: codeBlock(oldMessage.content, '*Bilinmiyor (mesaj önbellekte değildi)*'), inline: false },
                { name: 'Yeni İçerik', value: codeBlock(fresh.content, '*Bilinmiyor*'), inline: false }
            )
            .setFooter({ text: `Kullanıcı ID: ${author.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
};
