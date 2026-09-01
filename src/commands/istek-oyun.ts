import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('istek-oyun')
        .setDescription('Kullanıcıların oynamak istediği oyunu belirtmesini sağlar.')
        .addIntegerOption(option => option.setName('appid').setDescription('İstediğiniz oyunun Steam App ID numarası').setRequired(true)),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

        // Kanal kısıtlaması (Yöneticiler her kanalda kullanabilir)
        if (interaction.channelId !== CONFIG.REQUEST_CHANNEL && !isAdmin) {
            return interaction.reply({ 
                content: `❌ Bu komutu sadece <#${CONFIG.REQUEST_CHANNEL}> kanalında kullanabilirsiniz.`, 
                ephemeral: true 
            });
        }

        const appId = interaction.options.getInteger('appid', true);
        await interaction.deferReply();

        try {
            const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=turkish`);
            const json = await response.json();

            if (!json[appId] || !json[appId].success) {
                return interaction.editReply({ content: `❌ Bulunamadı: \`${appId}\` numaralı oyun Steam'de bulunamadı.` });
            }

            const data = json[appId].data;
            const priceText = data.is_free ? 'Ücretsiz' : (data.price_overview ? data.price_overview.final_formatted : 'Fiyat bilgisi yok');
            
            const embed = new EmbedBuilder()
                .setTitle(`🎮 Yeni İstek Oyun: ${data.name}`)
                .setURL(`https://store.steampowered.com/app/${appId}/`)
                .setThumbnail(data.header_image)
                .addFields(
                    { name: 'İsteyen Kullanıcı', value: `${interaction.user}`, inline: true },
                    { name: 'Oyun Fiyatı', value: priceText, inline: true },
                    { name: 'App ID', value: `\`${appId}\``, inline: true }
                )
                .setColor('#FF9900') 
                .setFooter({ text: 'İstek Sistemi | Beklemede' })
                .setTimestamp();

            const approveBtn = new ButtonBuilder()
                .setCustomId('approve_request')
                .setLabel('Onayla')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅');
                
            const rejectBtn = new ButtonBuilder()
                .setCustomId('reject_request')
                .setLabel('Reddet')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌');

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(approveBtn, rejectBtn);

            await interaction.editReply({ content: `✅ ${interaction.user} oyun isteğini gönderdi!`, embeds: [embed], components: [row] });
        } catch (error) {
            console.error('[ERROR] /istek-oyun command:', error);
            await interaction.editReply({ content: 'Steam verileri çekilirken bir hata oluştu.' });
        }
    }
};
