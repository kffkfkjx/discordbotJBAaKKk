import { Events, Message, PartialMessage, EmbedBuilder, Client } from 'discord.js';
import { CONFIG } from '../config';
import { codeBlock, getSendableChannel } from '../utils';

// Mükerrer tetiklenmeyi ve çift log gönderilmesini engelleyen önbellek
const processedDeletions = new Map<string, number>();

// 5 dakikada bir eski kayıtları temizle
setInterval(() => {
    const now = Date.now();
    for (const [id, time] of processedDeletions) {
        if (now - time > 60000) processedDeletions.delete(id);
    }
}, 5 * 60 * 1000);

module.exports = {
    name: Events.MessageDelete,
    async execute(message: Message | PartialMessage, client: Client) {
        // DM mesajlarını ve bot mesajlarını yoksay
        if (!message.guild || !message.id) return;
        if (message.author?.bot) return;

        // 1. Process içi mükerrer log engeli
        const now = Date.now();
        const lastProcessed = processedDeletions.get(message.id);
        if (lastProcessed && (now - lastProcessed < 60000)) {
            return;
        }
        processedDeletions.set(message.id, now);

        const logChannel = getSendableChannel(client, CONFIG.CHANNELS.LOG_CHANNEL);
        if (!logChannel) return;

        // 2. Çift bot / çift instance engeli: Log kanalında bu mesaj ID'si son 5 mesajda zaten paylaşılmış mı kontrol et
        try {
            const recentMessages = await logChannel.messages.fetch({ limit: 5 }).catch(() => null);
            if (recentMessages) {
                const alreadyLogged = recentMessages.some((m: any) => 
                    m.embeds?.[0]?.footer?.text?.includes(message.id)
                );
                if (alreadyLogged) {
                    return; // Diğer bot / instance zaten loglamış, tekrar gönderme!
                }
            }
        } catch {}

        // Mesaj önbellekte yoksa (bot yeniden başladıktan önce atılmış mesajlar) Discord
        // sadece ID gönderir; author ve content null olur. Bu yüzden her alan güvenli okunur.
        const author = message.author ?? null;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mesaj Silindi')
            .setColor('#FF5555')
            .setTimestamp();

        if (author) {
            embed.setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() });
        } else {
            embed.setAuthor({ name: 'Bilinmeyen Kullanıcı' });
        }

        embed.addFields(
            { name: 'Kanal', value: `<#${message.channelId}>`, inline: true },
            { name: 'Kullanıcı', value: author ? `${author} (\`${author.id}\`)` : '*Bilinmiyor (mesaj önbellekte değildi)*', inline: true },
            { name: 'Silinen İçerik', value: codeBlock(message.content), inline: false }
        );

        const attachmentCount = message.attachments?.size ?? 0;
        if (attachmentCount > 0) {
            embed.addFields({ name: 'Eklentiler', value: `${attachmentCount} adet dosya/resim vardı.`, inline: false });
        }

        embed.setFooter({ text: `Mesaj ID: ${message.id}` });

        await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
};
