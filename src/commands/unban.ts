import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Kullanıcının yasaklamasını (ban) kaldırır (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option => option.setName('kullanici_id').setDescription('Banı kaldırılacak kullanıcının ID numarası').setRequired(true)),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.options.getString('kullanici_id', true);
        
        try {
            // Unban the user
            await interaction.guild?.members.unban(userId);
            
            await interaction.reply({ 
                content: `✅ Belirtilen ID'ye (\`${userId}\`) sahip kullanıcının yasaklaması başarıyla kaldırıldı.`, 
                ephemeral: true 
            });

            // Log the unban
            const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔓 Kullanıcı Yasaklaması Kaldırıldı (Unban)')
                    .setColor('#00FF00') // Yeşil
                    .addFields(
                        { name: 'Kullanıcı ID', value: userId, inline: true },
                        { name: 'İşlemi Yapan Yetkili', value: `${interaction.user}`, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('[ERROR] /unban command:', error);
            await interaction.reply({ 
                content: 'Ban kaldırma işlemi başarısız oldu. Girdiğiniz ID yanlış olabilir veya kullanıcı banlı olmayabilir.', 
                ephemeral: true 
            });
        }
    }
};
