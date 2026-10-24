import { Events, Message, PartialMessage, EmbedBuilder, Client } from 'discord.js';
import { CONFIG } from '../config';
import { codeBlock, getSendableChannel } from '../utils';

module.exports = {
    name: Events.MessageDelete,
    async execute(message: Message | PartialMessage, client: Client) {
        // DM mesajlarını ve bot mesajlarını yoksay
        if (!message.guild) return;
        if (message.author?.bot) return;

        const logChannel = getSendableChannel(client, CONFIG.CHANNELS.LOG_CHANNEL);
        if (!logChannel) return;

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
