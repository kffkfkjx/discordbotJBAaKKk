import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekilissetup')
        .setDescription('Profesyonel ve butonlu çekiliş sistemi başlatır (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(option => option.setName('odul').setDescription('Çekiliş Ödülü').setRequired(true))
        .addIntegerOption(option => option.setName('sure_dakika').setDescription('Kaç dakika sürecek?').setRequired(true).setMinValue(1))
        .addIntegerOption(option => option.setName('kazanan_sayisi').setDescription('Kaç kişi kazanacak?').setRequired(true).setMinValue(1).setMaxValue(20))
        .addStringOption(option => 
            option.setName('secim_turu')
                .setDescription('Kazananlar nasıl belirlensin?')
                .addChoices(
                    { name: 'Rastgele (Otomatik)', value: 'random' },
                    { name: 'Ben Seçeceğim (Manuel)', value: 'manual' }
                )
                .setRequired(false)
        )
        .addStringOption(option => option.setName('sart').setDescription('Çekiliş şartı var mı? (Örn: Sunucuya davet)').setRequired(false)),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const prize = interaction.options.getString('odul', true);
        const durationMins = interaction.options.getInteger('sure_dakika', true);
        const winnerCount = interaction.options.getInteger('kazanan_sayisi', true);
        const selectionType = interaction.options.getString('secim_turu') || 'random';
        const condition = interaction.options.getString('sart') || 'Belirtilmedi';

        const endTime = Date.now() + durationMins * 60 * 1000;
        const giveawayId = `gw_${Date.now()}`;

        // Initialize in memory
        (interaction.client as any).giveaways.set(giveawayId, {
            participants: new Set<string>(),
            prize,
            winnerCount,
            endTime,
            cancelled: false,
            messageId: null,
            channelId: interaction.channelId,
            selectionType,
            hostId: interaction.user.id
        });

        const typeText = selectionType === 'random' ? '🤖 Rastgele Çekilecek' : '👑 Yönetici Seçecek';

        const embed = new EmbedBuilder()
            .setTitle('🎉 YENİ ÇEKİLİŞ BAŞLADI! 🎉')
            .setColor('#9B59B6')
            .setDescription(`**Ödül:** ${prize}\n\n**Bitiş Zamanı:** <t:${Math.floor(endTime / 1000)}:R>\n**Kazanacak Kişi Sayısı:** ${winnerCount}\n**Şartlar:** ${condition}\n**Kazanan Seçimi:** ${typeText}`)
            .setFooter({ text: `${durationMins} Dakika Sürecek | Katılımcı: 0` })
            .setTimestamp();

        const joinBtn = new ButtonBuilder()
            .setCustomId(`gw_join_${giveawayId}`)
            .setLabel('Çekilişe Katıl')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎁');

        const cancelBtn = new ButtonBuilder()
            .setCustomId(`gw_cancel_${giveawayId}`)
            .setLabel('İptal Et')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🛑');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(joinBtn, cancelBtn);

        // FetchReply allows us to get the sent message object back
        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        
        // Save message ID
        const gwData = (interaction.client as any).giveaways.get(giveawayId);
        if (gwData) {
            gwData.messageId = msg.id;
        }

        // Set timeout to end giveaway
        setTimeout(async () => {
            const currentGw = (interaction.client as any).giveaways.get(giveawayId);
            if (!currentGw || currentGw.cancelled) return; // Already cancelled or deleted

            const channel = interaction.client.channels.cache.get(currentGw.channelId) as TextChannel;
            if (!channel) return;

            const giveawayMessage = await channel.messages.fetch(currentGw.messageId).catch(() => null);
            if (!giveawayMessage) return;

            const participants = Array.from(currentGw.participants) as string[];

            if (currentGw.selectionType === 'manual') {
                // Manuel seçim için orijinal mesajı güncelle
                const waitEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
                    .setTitle('⏳ ÇEKİLİŞ SONA ERDİ (SEÇİM BEKLENİYOR) ⏳')
                    .setColor('#FFA500') // Turuncu (Bekleme)
                    .setDescription(`**Ödül:** ${currentGw.prize}\n\n*Yönetici şu an kazananları manuel olarak seçiyor...*`)
                    .setFooter({ text: `Sona Erdi | Toplam Katılımcı: ${currentGw.participants.size}` })
                    .setTimestamp(new Date());

                // Butonları deaktif et
                const disabledJoin = ButtonBuilder.from(joinBtn).setDisabled(true);
                const disabledCancel = ButtonBuilder.from(cancelBtn).setDisabled(true);
                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledJoin, disabledCancel);
                
                await giveawayMessage.edit({ embeds: [waitEmbed], components: [disabledRow] });

                if (participants.length === 0) {
                    await channel.send(`😔 Yeterli katılım olmadığı için **${currentGw.prize}** çekilişi iptal edildi.`);
                    (interaction.client as any).giveaways.delete(giveawayId);
                    return;
                }

                // Yöneticiden seçim yapmasını iste
                const selectBtn = new ButtonBuilder()
                    .setCustomId(`gw_manual_pick_${giveawayId}`)
                    .setLabel('Kazananları Seç')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('👑');
                
                const selectRow = new ActionRowBuilder<ButtonBuilder>().addComponents(selectBtn);
                
                await channel.send({ 
                    content: `👑 <@${currentGw.hostId}>, **${currentGw.prize}** çekilişinin süresi doldu!\nLütfen kazanan ${currentGw.winnerCount} kişiyi seçmek için aşağıdaki butona tıkla.`,
                    components: [selectRow]
                });

                // Not: Çekilişi henüz memory'den silmiyoruz, seçim yaptıktan sonra sileceğiz.
                return;
            }

            // Rastgele (Otomatik) seçim
            const winners: string[] = [];
            if (participants.length > 0) {
                for (let i = 0; i < currentGw.winnerCount; i++) {
                    if (participants.length > 0) {
                        const randIdx = Math.floor(Math.random() * participants.length);
                        winners.push(participants[randIdx]);
                        participants.splice(randIdx, 1);
                    }
                }
            }

            const winnersText = winners.length > 0 ? winners.map(w => `<@${w}>`).join(', ') : 'Kimse katılmadı!';

            const endEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
                .setTitle('🎉 ÇEKİLİŞ SONA ERDİ! 🎉')
                .setColor('#333333') // Koyu renk
                .setDescription(`**Ödül:** ${currentGw.prize}\n\n**Kazananlar:** ${winnersText}\n**Şartlar:** ${condition}`)
                .setFooter({ text: `Sona Erdi | Toplam Katılımcı: ${currentGw.participants.size}` })
                .setTimestamp(new Date());

            // Disable buttons
            const disabledJoin = ButtonBuilder.from(joinBtn).setDisabled(true);
            const disabledCancel = ButtonBuilder.from(cancelBtn).setDisabled(true);
            const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledJoin, disabledCancel);

            await giveawayMessage.edit({ embeds: [endEmbed], components: [disabledRow] });

            if (winners.length > 0) {
                await channel.send(`🎊 Tebrikler ${winnersText}! **${currentGw.prize}** kazandınız!`);
            } else {
                await channel.send(`😔 Yeterli katılım olmadığı için **${currentGw.prize}** çekilişinde kazanan belirlenemedi.`);
            }

            // Cleanup
            (interaction.client as any).giveaways.delete(giveawayId);

        }, durationMins * 60 * 1000);
    }
};
