import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban-liste')
        .setDescription('Sunucudaki yasaklanmış kullanıcıları listeler (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
        
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const bans = await interaction.guild?.bans.fetch();
            
            if (!bans || bans.size === 0) {
                return interaction.reply({ content: 'Sunucuda yasaklanmış kimse bulunmuyor.', ephemeral: true });
            }

            const banList = bans.map(ban => `• **${ban.user.tag}** (ID: \`${ban.user.id}\`) - Sebep: ${ban.reason || 'Belirtilmedi'}`).slice(0, 15);
            const extra = bans.size > 15 ? `\n\n*...ve ${bans.size - 15} kişi daha.*` : '';

            const embed = new EmbedBuilder()
                .setTitle(`🔨 Banlı Kullanıcılar Listesi (Toplam: ${bans.size})`)
                .setDescription(banList.join('\n') + extra)
                .setColor('#2b2d31')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('[ERROR] /ban-liste command:', error);
            await interaction.reply({ content: 'Banlı kullanıcılar listelenirken bir hata oluştu.', ephemeral: true });
        }
    }
};
