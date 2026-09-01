"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('kilitle')
        .setDescription('Kanalı üyelerin mesaj yazmasına kapatır (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        const channel = interaction.channel;
        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false
            });
            await interaction.reply({
                content: '✅ Kanal başarıyla kilitlendi. Üyeler artık mesaj gönderemez.',
                ephemeral: true
            });
            await channel.send({ content: '🔒 **Bu kanal yetkililer tarafından geçici olarak mesaj gönderimine kapatılmıştır.**' });
            const logChannel = interaction.client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
            if (logChannel) {
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle('🔒 Kanal Kilitlendi')
                    .setColor('#FF0000')
                    .addFields({ name: 'Kanal', value: `${channel}`, inline: true }, { name: 'Yetkili', value: `${interaction.user}`, inline: true })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        catch (error) {
            console.error('[ERROR] /kilitle command:', error);
            await interaction.reply({ content: 'Kanal kilitlenirken hata oluştu! Botun rolleri yönetme yetkisi eksik olabilir.', ephemeral: true });
        }
    }
};
