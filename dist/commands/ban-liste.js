"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ban-liste')
        .setDescription('Sunucudaki yasaklanmış kullanıcıları listeler (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        try {
            const bans = await interaction.guild?.bans.fetch();
            if (!bans || bans.size === 0) {
                return interaction.reply({ content: 'Sunucuda yasaklanmış kimse bulunmuyor.', ephemeral: true });
            }
            const banList = bans.map(ban => `• **${ban.user.tag}** (ID: \`${ban.user.id}\`) - Sebep: ${ban.reason || 'Belirtilmedi'}`).slice(0, 15);
            const extra = bans.size > 15 ? `\n\n*...ve ${bans.size - 15} kişi daha.*` : '';
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`🔨 Banlı Kullanıcılar Listesi (Toplam: ${bans.size})`)
                .setDescription(banList.join('\n') + extra)
                .setColor('#2b2d31')
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (error) {
            console.error('[ERROR] /ban-liste command:', error);
            await interaction.reply({ content: 'Banlı kullanıcılar listelenirken bir hata oluştu.', ephemeral: true });
        }
    }
};
