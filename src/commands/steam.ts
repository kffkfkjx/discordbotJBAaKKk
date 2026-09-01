import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steam')
        .setDescription('Steam AppID ile oyun detaylarını getirir.')
        .addIntegerOption(option => option.setName('appid').setDescription('Oyunun Steam App ID numarası (Örn: 730)').setRequired(true)),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const appId = interaction.options.getInteger('appid', true);
        await interaction.deferReply();

        try {
            const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=turkish`);
            const json = await response.json();

            if (!json[appId] || !json[appId].success) {
                return interaction.editReply({ content: `❌ Bulunamadı: \`${appId}\` ID'sine sahip geçerli bir Steam oyunu yok.` });
            }

            const data = json[appId].data;
            const priceText = data.is_free ? 'Ücretsiz' : (data.price_overview ? data.price_overview.final_formatted : 'Fiyat bilgisi yok');
            
            // Clean HTML tags from description
            const cleanDescription = (data.short_description || '').replace(/<[^>]*>?/gm, '').substring(0, 500);

            const embed = new EmbedBuilder()
                .setTitle(data.name || 'Bilinmeyen Oyun')
                .setURL(`https://store.steampowered.com/app/${appId}/`)
                .setDescription((cleanDescription || 'Açıklama bulunamadı.') + '\n\n**🎁 Bu oyuna ve 100.000+ den fazla oyuna sitemizden bedava erişebilirsin!**')
                .setThumbnail(data.header_image)
                .addFields(
                    { name: 'Geliştirici', value: data.developers ? data.developers.join(', ') : 'Bilinmiyor', inline: true },
                    { name: 'Fiyat', value: priceText, inline: true },
                    { name: 'Çıkış Tarihi', value: data.release_date?.date || 'Bilinmiyor', inline: true }
                )
                .setColor('#171a21') // Steam brand color
                .setFooter({ text: 'Steam API Data' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[ERROR] /steam command:', error);
            await interaction.editReply({ content: 'Steam verileri çekilirken bir hata oluştu.' });
        }
    }
};
