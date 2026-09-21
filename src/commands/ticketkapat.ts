import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder, GuildMember } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketkapat')
        .setDescription('Mevcut destek talebini (ticket) kapatır ve loglar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const channelName = (interaction.channel as any).name || '';
        
        // Sadece ticket kanallarında çalışmasını sağla
        if (!channelName.startsWith('genel-sorular-') && 
            !channelName.startsWith('teknik-destek-') && 
            !channelName.startsWith('satin-alim-') && 
            !channelName.startsWith('destek-')) {
            return interaction.reply({ content: 'Bu komut sadece bilet (ticket) kanallarında kullanılabilir!', ephemeral: true });
        }

        await interaction.reply({ content: '🔒 Ticket kapatılıyor... Arşiv (log) hazırlanıyor.' });

        try {
            if (interaction.channel) {
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const msgsArray = Array.from(messages.values()).reverse();
                
                let transcript = `--- TICKET LOG (${channelName}) ---\n\n`;
                msgsArray.forEach(m => {
                    const date = new Date(m.createdTimestamp).toLocaleString('tr-TR');
                    transcript += `[${date}] ${m.author?.tag || 'Bilinmeyen Kullanıcı'}: ${m.content}\n`;
                });

                const transcriptAttachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `${channelName}-log.txt` });

                const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.TICKET_LOG_CHANNEL) as any;
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🎫 Ticket Kapatıldı ve Arşivlendi')
                        .setColor('#FF0000')
                        .addFields(
                            { name: 'Kapatan Yetkili', value: `<@${interaction.user.id}>`, inline: true },
                            { name: 'Ticket Adı', value: `${channelName}`, inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed], files: [transcriptAttachment] }).catch(()=>null);
                }
                
                setTimeout(() => {
                    if (interaction.channel) interaction.channel.delete().catch(()=>null);
                }, 4000);
            }
        } catch (err) {
            console.error('[ERROR] Ticket loglama hatası:', err);
            if (interaction.channel) interaction.channel.delete().catch(()=>null);
        }
    }
};
