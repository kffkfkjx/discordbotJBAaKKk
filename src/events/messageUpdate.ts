import { Events, Message, PartialMessage, EmbedBuilder, Client } from 'discord.js';
import { CONFIG } from '../config';
import { codeBlock, getSendableChannel } from '../utils';

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

        const logChannel = getSendableChannel(client, CONFIG.CHANNELS.LOG_CHANNEL);
        if (!logChannel) return;

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
