"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('kilit-ac')
        .setDescription('Kilitlenmiş kanalın mesaj gönderimini tekrar açar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        const channel = interaction.channel;
        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null // Reset to default
            });
            await interaction.reply({
                content: '✅ Kanalın kilidi başarıyla açıldı.',
                ephemeral: true
            });
            await channel.send({ content: '🔓 **Kanal kilidi açılmıştır, mesaj gönderebilirsiniz.**' });
            const logChannel = interaction.client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
            if (logChannel) {
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle('🔓 Kanal Kilidi Açıldı')
                    .setColor('#00FF00')
                    .addFields({ name: 'Kanal', value: `${channel}`, inline: true }, { name: 'Yetkili', value: `${interaction.user}`, inline: true })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        catch (error) {
            console.error('[ERROR] /kilit-ac command:', error);
            await interaction.reply({ content: 'Kanal kilidi açılırken hata oluştu!', ephemeral: true });
        }
    }
};
