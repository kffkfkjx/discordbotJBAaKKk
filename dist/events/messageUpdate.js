"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    name: discord_js_1.Events.MessageUpdate,
    async execute(oldMessage, newMessage, client) {
        if (newMessage.author?.bot || !newMessage.guild)
            return;
        if (oldMessage.content === newMessage.content)
            return; // Sadece içerik değiştiyse logla
        const logChannel = client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
        if (!logChannel)
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('✏️ Mesaj Düzenlendi')
            .setColor('#FFAA00')
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
            .addFields({ name: 'Kanal', value: `${newMessage.channel}`, inline: true }, { name: 'Mesaja Git', value: `[Tıkla](${newMessage.url})`, inline: true }, { name: 'Eski İçerik', value: oldMessage.content ? `\`\`\`\n${oldMessage.content.substring(0, 1000)}\n\`\`\`` : '*Bilinmiyor*', inline: false }, { name: 'Yeni İçerik', value: newMessage.content ? `\`\`\`\n${newMessage.content.substring(0, 1000)}\n\`\`\`` : '*Bilinmiyor*', inline: false })
            .setTimestamp();
        await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
};
