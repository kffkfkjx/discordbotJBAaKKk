import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Belirtilen kullanıcıyı sunucudan atar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option => option.setName('kullanici').setDescription('Atılacak kullanıcı').setRequired(true))
        .addStringOption(option => option.setName('sebep').setDescription('Atılma sebebi').setRequired(false)),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('kullanici', true);
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: 'Bu kullanıcı sunucuda bulunamadı.', ephemeral: true });
        }

        try {
            await member.kick(reason);
            await interaction.reply({ 
                content: `✅ ${user} kullanıcısı sunucudan başarıyla atıldı (Kick).\n📝 **Sebep:** ${reason}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('[ERROR] /kick command member.kick:', error);
            await interaction.reply({ 
                content: 'Kullanıcıyı atarken hata oluştu! Botun rolü, atılacak kişinin rolünden daha düşük olabilir.',
                ephemeral: true
            });
            return;
        }

        // Log (Ayrı bir try-catch içinde, log atamasa bile asıl işlemi bozmasın)
        try {
            const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('👢 Kullanıcı Atıldı (Kick)')
                    .setColor('#FFA500') // Turuncu
                    .setThumbnail(user.displayAvatarURL())
                    .addFields(
                        { name: 'Atılan', value: `${user} (${user.id})`, inline: true },
                        { name: 'İşlemi Yapan Yetkili', value: `${interaction.user}`, inline: true },
                        { name: 'Sebep', value: reason, inline: false }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('[ERROR] /kick command log:', error);
        }
    }
};
