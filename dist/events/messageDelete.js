"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    name: discord_js_1.Events.MessageDelete,
    async execute(message, client) {
        if (message.author?.bot || !message.guild)
            return;
        const logChannel = client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
        if (!logChannel)
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🗑️ Mesaj Silindi')
            .setColor('#FF5555')
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .addFields({ name: 'Kanal', value: `${message.channel}`, inline: true }, { name: 'Kullanıcı', value: `${message.author} (\`${message.author.id}\`)`, inline: true }, { name: 'Silinen İçerik', value: message.content ? `\`\`\`\n${message.content.substring(0, 1000)}\n\`\`\`` : '*İçerik yok veya okunamadı*', inline: false })
            .setTimestamp();
        if (message.attachments.size > 0) {
            embed.addFields({ name: 'Eklentiler', value: `${message.attachments.size} adet dosya/resim vardı.`, inline: false });
        }
        await logChannel.send({ embeds: [embed] }).catch(() => null);
    }
};
