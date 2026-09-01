import { Events, Message, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage: Message, newMessage: Message, client: any) {
        if (newMessage.author?.bot || !newMessage.guild) return;
        if (oldMessage.content === newMessage.content) return; // Sadece içerik değiştiyse logla

        const logChannel = client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Mesaj Düzenlendi')
            .setColor('#FFAA00')
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
            .addFields(
                { name: 'Kanal', value: `${newMessage.channel}`, inline: true },
                { name: 'Mesaja Git', value: `[Tıkla](${newMessage.url})`, inline: true },
                { name: 'Eski İçerik', value: oldMessage.content ? `\`\`\`\n${oldMessage.content.substring(0, 1000)}\n\`\`\`` : '*Bilinmiyor*', inline: false },
                { name: 'Yeni İçerik', value: newMessage.content ? `\`\`\`\n${newMessage.content.substring(0, 1000)}\n\`\`\`` : '*Bilinmiyor*', inline: false }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
};
