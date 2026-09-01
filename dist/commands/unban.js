"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('unban')
        .setDescription('Kullanıcının yasaklamasını (ban) kaldırır (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers)
        .addStringOption(option => option.setName('kullanici_id').setDescription('Banı kaldırılacak kullanıcının ID numarası').setRequired(true)),
    async execute(interaction) {
        const userId = interaction.options.getString('kullanici_id', true);
        try {
            // Unban the user
            await interaction.guild?.members.unban(userId);
            await interaction.reply({
                content: `✅ Belirtilen ID'ye (\`${userId}\`) sahip kullanıcının yasaklaması başarıyla kaldırıldı.`,
                ephemeral: true
            });
            // Log the unban
            const logChannel = interaction.client.channels.cache.get(config_1.CONFIG.CHANNELS.LOG_CHANNEL);
            if (logChannel) {
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle('🔓 Kullanıcı Yasaklaması Kaldırıldı (Unban)')
                    .setColor('#00FF00') // Yeşil
                    .addFields({ name: 'Kullanıcı ID', value: userId, inline: true }, { name: 'İşlemi Yapan Yetkili', value: `${interaction.user}`, inline: true })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        catch (error) {
            console.error('[ERROR] /unban command:', error);
            await interaction.reply({
                content: 'Ban kaldırma işlemi başarısız oldu. Girdiğiniz ID yanlış olabilir veya kullanıcı banlı olmayabilir.',
                ephemeral: true
            });
        }
    }
};
