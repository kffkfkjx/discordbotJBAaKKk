import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kilit-ac')
        .setDescription('Kilitlenmiş kanalın mesaj gönderimini tekrar açar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const channel = interaction.channel as TextChannel;
        
        try {
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
                SendMessages: null // Reset to default
            });
            
            await interaction.reply({ 
                content: '✅ Kanalın kilidi başarıyla açıldı.', 
                ephemeral: true 
            });

            await channel.send({ content: '🔓 **Kanal kilidi açılmıştır, mesaj gönderebilirsiniz.**' });

            const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔓 Kanal Kilidi Açıldı')
                    .setColor('#00FF00')
                    .addFields(
                        { name: 'Kanal', value: `${channel}`, inline: true },
                        { name: 'Yetkili', value: `${interaction.user}`, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('[ERROR] /kilit-ac command:', error);
            await interaction.reply({ content: 'Kanal kilidi açılırken hata oluştu!', ephemeral: true });
        }
    }
};
