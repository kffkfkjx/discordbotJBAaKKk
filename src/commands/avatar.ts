import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('İstediğiniz kullanıcının veya kendi profil resminizi büyütüp gösterir.')
        .addUserOption(option => option.setName('kullanici').setDescription('Profil resmine bakılacak kullanıcı').setRequired(false)),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser('kullanici') || interaction.user;
        const avatarUrl = user.displayAvatarURL({ size: 2048, extension: 'png' });

        const embed = new EmbedBuilder()
            .setTitle(`🖼️ ${user.tag} Avatarı`)
            .setImage(avatarUrl)
            .setColor('#2b2d31')
            .setFooter({ text: `İsteyen: ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

