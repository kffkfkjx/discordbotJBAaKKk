"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ban')
        .setDescription('Belirtilen kullanıcıyı sunucudan kalıcı olarak yasaklar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
        .addUserOption(option => option.setName('kullanici').setDescription('Yasaklanacak kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Yasaklanma sebebi').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('kullanici', true);
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: 'Bu kullanıcı sunucuda bulunamadı veya zaten yasaklanmış.', ephemeral: true });
        }
        try {
            await member.ban({ reason });
            await interaction.reply({
                content: `🔨 ${user} kullanıcısı sunucudan başarıyla yasaklandı.\n📝 **Sebep:** ${reason}`,
                ephemeral: true
            });
            // Log the ban
            const logChannel = interaction.client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
            if (logChannel) {
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle('🔨 Kullanıcı Yasaklandı (Ban)')
                    .setColor('#8B0000') // Koyu Kırmızı
                    .setThumbnail(user.displayAvatarURL())
                    .addFields({ name: 'Yasaklanan', value: `${user} (${user.id})`, inline: true }, { name: 'Yasaklayan Yetkili', value: `${interaction.user}`, inline: true }, { name: 'Sebep', value: reason, inline: false })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        catch (error) {
            console.error('[ERROR] /ban command:', error);
            await interaction.reply({
                content: 'Kullanıcıyı yasaklarken hata oluştu! Botun yetkisi (rol sırası) buna engel oluyor olabilir.',
                ephemeral: true
            });
        }
    }
};
