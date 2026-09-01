"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('rol-al')
        .setDescription('Belirtilen kullanıcının seçtiğiniz rolünü alır (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageRoles)
        .addUserOption(option => option.setName('kullanici').setDescription('Rolü alınacak kullanıcı').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('Alınacak rol').setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('kullanici', true);
        const role = interaction.options.getRole('rol', true);
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: 'Kullanıcı sunucuda bulunamadı.', ephemeral: true });
        }
        try {
            await member.roles.remove(role.id);
            await interaction.reply({
                content: `✅ Başarılı! ${user} kullanıcısından **${role.name}** rolü alındı.`,
                ephemeral: true
            });
            // Log it
            const logChannel = interaction.client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
            if (logChannel) {
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle('🏷️ Kullanıcıdan Rol Alındı')
                    .setColor('#FF0000')
                    .addFields({ name: 'Kullanıcı', value: `${user}`, inline: true }, { name: 'Alınan Rol', value: `${role}`, inline: true }, { name: 'Yetkili', value: `${interaction.user}`, inline: true })
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(() => null);
            }
        }
        catch (error) {
            console.error('[ERROR] /rol-al command:', error);
            await interaction.reply({ content: 'Rol alınırken bir hata oluştu! Botun rolü, almaya çalıştığı rolden daha alt sırada olabilir.', ephemeral: true });
        }
    }
};
