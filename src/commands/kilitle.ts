import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kilitle')
        .setDescription('Kanalı üyelerin mesaj yazmasına kapatır (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const channel = interaction.channel as TextChannel;
        
        try {
            await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
                SendMessages: false
            });
            
            await interaction.reply({ 
                content: '✅ Kanal başarıyla kilitlendi. Üyeler artık mesaj gönderemez.', 
                ephemeral: true 
            });

            await channel.send({ content: '🔒 **Bu kanal yetkililer tarafından geçici olarak mesaj gönderimine kapatılmıştır.**' });

            const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔒 Kanal Kilitlendi')
                    .setColor('#FF0000')
                    .addFields(
                        { name: 'Kanal', value: `${channel}`, inline: true },
                        { name: 'Yetkili', value: `${interaction.user}`, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('[ERROR] /kilitle command:', error);
            await interaction.reply({ content: 'Kanal kilitlenirken hata oluştu! Botun rolleri yönetme yetkisi eksik olabilir.', ephemeral: true });
        }
    }
};
