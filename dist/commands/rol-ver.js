"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('rol-ver')
        .setDescription('Belirtilen kullanıcıya seçtiğiniz rolü verir (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageRoles)
        .addUserOption(option => option.setName('kullanici').setDescription('Rol verilecek kullanıcı').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('Verilecek rol').setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser('kullanici', true);
        const role = interaction.options.getRole('rol', true);
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: 'Kullanıcı sunucuda bulunamadı.', ephemeral: true });
        }
        try {
            await member.roles.add(role.id);
            await interaction.reply({
                content: `✅ Başarılı! ${user} kullanıcısına **${role.name}** rolü verildi.`,
                ephemeral: true
            });
            // Log it
            const logChannel = interaction.client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
            if (logChannel) {
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle('🏷️ Kullanıcıya Rol Verildi')
                    .setColor('#00FF00')
                    .addFields({ name: 'Kullanıcı', value: `${user}`, inline: true }, { name: 'Rol', value: `${role}`, inline: true }, { name: 'Yetkili', value: `${interaction.user}`, inline: true })
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] }).catch(() => null);
            }
        }
        catch (error) {
            console.error('[ERROR] /rol-ver command:', error);
            await interaction.reply({ content: 'Rol verilirken bir hata oluştu! Botun rolü, vermeye çalıştığı rolden daha alt sırada olabilir.', ephemeral: true });
        }
    }
};
