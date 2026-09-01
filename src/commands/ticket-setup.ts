import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Destek talebi (Ticket) sistemini bu kanala kurar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle('👋 NexoGame Destek Merkezine Hoş Geldin!')
            .setDescription('📥 Aşağıdaki açılır menüden sana uygun olan kategoriyi seçerek anında destek talebi (ticket) oluşturabilirsin. Ekibimiz en kısa sürede seninle ilgilenecektir.')
            .setColor('#2F3136') // Dark theme color matches Discord
            .setImage('https://giffiles.alphacoders.com/154/15472.gif');

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('Bir destek kategorisi seçin...')
                    .addOptions([
                        {
                            label: 'NexoGame Genel Destek',
                            description: 'Aklınıza takılan tüm genel konular için bilet açabilirsiniz.',
                            emoji: '⚙️',
                            value: 'ticket_genel',
                        },
                        {
                            label: 'NexoGame Teknik Servis',
                            description: 'Oyun içi veya sistemsel teknik problemler için yardım alın.',
                            emoji: '🛠️',
                            value: 'ticket_teknik',
                        },
                        {
                            label: 'NexoGame Satın Alım',
                            description: 'Ürün alma, hesap veya bakiye gibi işlemler için ulaşın.',
                            emoji: '🛒',
                            value: 'ticket_satin',
                        },
                        {
                            label: 'Seçimi Sıfırla',
                            description: 'Farklı bir kategori seçmek için menüyü temizler.',
                            emoji: '🔄',
                            value: 'ticket_reset',
                        },
                    ])
            );

        await interaction.reply({ 
            content: 'Ticket sistemi başarıyla kuruldu.', 
            ephemeral: true 
        });

        const channel = interaction.channel;
        if (channel && channel.isTextBased() && 'send' in channel) {
            await channel.send({ embeds: [embed], components: [row] });
        }
    }
};
