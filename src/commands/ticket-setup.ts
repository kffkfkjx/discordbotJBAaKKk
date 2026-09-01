import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Destek talebi (Ticket) sistemini bu kanala kurar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle('👋 Hoşgeldin!')
            .setDescription('📥 Aşağıdaki butonlardan uygun kategoriyi seçerek bir destek talebi oluşturabilirsin!')
            .setColor('#2F3136') // Dark theme color matches Discord
            .setImage('https://giffiles.alphacoders.com/154/15472.gif');

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('Bir kategori seçin...')
                    .addOptions([
                        {
                            label: 'Genel Sorular',
                            description: 'Genel sorularınız için bilet açın.',
                            emoji: '⚙️',
                            value: 'ticket_genel',
                        },
                        {
                            label: 'Teknik Destek',
                            description: 'Yaşadığınız teknik sorunlar için yardım alın.',
                            emoji: '🛠️',
                            value: 'ticket_teknik',
                        },
                        {
                            label: 'Satın Alım',
                            description: 'Ürün satın alımı ile ilgili işlemler.',
                            emoji: '🛒',
                            value: 'ticket_satin',
                        },
                        {
                            label: 'Denuvo Aktivasyon',
                            description: 'Denuvo oyun aktivasyon işlemleri.',
                            emoji: '🛡️',
                            value: 'ticket_denuvo',
                        },
                        {
                            label: 'Seçimi Sıfırla',
                            description: 'Yaptığınız seçimi temizler.',
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
