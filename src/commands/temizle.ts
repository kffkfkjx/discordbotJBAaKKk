import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('temizle')
        .setDescription('Belirtilen miktarda mesajı kanaldan siler (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option => 
            option.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const amount = interaction.options.getInteger('miktar', true);
        const channel = interaction.channel as TextChannel;

        try {
            const deleted = await channel.bulkDelete(amount, true);
            await interaction.reply({ 
                content: `✅ Başarıyla **${deleted.size}** adet mesaj silindi. *(14 günden eski mesajlar Discord kuralları gereği silinemez)*`, 
                ephemeral: true 
            });
        } catch (error) {
            console.error('[ERROR] /temizle command:', error);
            await interaction.reply({ content: 'Mesajlar silinirken bir hata oluştu.', ephemeral: true });
        }
    }
};
