import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun gecikme sürelerini (ping) gösterir.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const sent = await interaction.reply({ content: 'Ping ölçülüyor...', fetchReply: true });
        
        const roundtripPing = sent.createdTimestamp - interaction.createdTimestamp;
        const websocketPing = interaction.client.ws.ping;

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor('#00FF00')
            .addFields(
                { name: '🤖 Bot Gecikmesi', value: `\`${roundtripPing}ms\``, inline: true },
                { name: '🌐 Discord API (WebSocket)', value: `\`${websocketPing}ms\``, inline: true }
            )
            .setFooter({ text: 'NexoGameST Sistem Durumu' })
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    }
};
