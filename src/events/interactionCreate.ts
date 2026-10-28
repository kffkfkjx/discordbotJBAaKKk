import { Events, Interaction, Client, GuildMember, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder , MessageFlags } from 'discord.js';
import { CONFIG } from '../config';
import { safeReply, truncate, handleCloseTicket } from '../utils';

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction, client: Client) {
        try {
            await handleInteraction(interaction, client);
        } catch (error) {
            console.error('[ERROR] Etkileşim işlenirken hata:', error);
            await safeReply(interaction, '❌ İşlem sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
        }
    },
};

async function handleInteraction(interaction: Interaction, client: Client) {
        
        // --- 1. HANDLE SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
                return;
            }

            // --- MERKEZİ KOMUT LOGLAMA (GLOBAL LOGGER) ---
            try {
                const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
                if (logChannel) {
                    const args = interaction.options.data.map(opt => `**${opt.name}**: ${opt.value}`).join(' | ');
                    const argsString = args.length > 0 ? truncate(args, 1000) : 'Parametre yok (Boş)';

                    const logEmbed = new EmbedBuilder()
                        .setTitle('💻 Komut Kullanıldı')
                        .setColor('#2C2F33') // Discord koyu grisi
                        .addFields(
                            { name: 'Kullanıcı', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                            { name: 'Komut', value: `\`/${interaction.commandName}\``, inline: true },
                            { name: 'Kanal', value: `${interaction.channel}`, inline: true },
                            { name: 'Parametreler / Girilen Bilgiler', value: argsString, inline: false }
                        )
                        .setTimestamp();

                    // Logu gönder (Hata verirse botun çökmemesi için catch)
                    logChannel.send({ embeds: [logEmbed] }).catch(() => null);
                }
            } catch (err) {
                console.error('[ERROR] Merkezi loglama hatası:', err);
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[ERROR] Executing command ${interaction.commandName}:`, error);
                await safeReply(interaction, 'Bu komutu çalıştırırken bir hata oluştu!');
            }
            return;
        }

        // --- 2. HANDLE BUTTON INTERACTIONS ---
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await handleCloseTicket(interaction);
            return;
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'register_button') {
                try {
                    // Check user account age
                    const accountCreated = interaction.user.createdAt;
                    const now = new Date();
                    const diffMs = now.getTime() - accountCreated.getTime();
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);

                    if (diffDays < CONFIG.REQUIRED_ACCOUNT_AGE_DAYS) {
                        return interaction.reply({ 
                            content: 'Hesabınız 1 aylık (30 günlük) değil, kayıt işlemi reddedildi.', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }

                    // Account is old enough, assign the Member role
                    const member = interaction.member as GuildMember;
                    
                    // Check if they already have the role
                    if (member.roles.cache.has(CONFIG.ROLES.MEMBER)) {
                        return interaction.reply({ 
                            content: 'Zaten kayıtlısınız.', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }

                    // Anında yanıt gönder (3 saniyelik timeout'u engeller)
                    await interaction.reply({ 
                        content: '✅ Başarıyla kayıt oldunuz.', 
                        flags: MessageFlags.Ephemeral 
                    });

                    // Arka planda rolü ver ve logla (await yok)
                    member.roles.add(CONFIG.ROLES.MEMBER).then(() => {
                        const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
                        if (logChannel) {
                            logChannel.send({
                                content: `✅ ${interaction.user} başarıyla kayıt oldu ve **Üye** rolü verildi.`
                            }).catch(() => null);
                        }
                    }).catch(error => {
                        console.error('[ERROR] Failed to add member role:', error);
                    });

                } catch (error) {
                    console.error('[ERROR] Failed to handle register_button:', error);
                    
                    // Specific error handling for permission issues
                    if (error instanceof Error && error.message.includes('Missing Permissions')) {
                        return safeReply(interaction, 'Kayıt işlemi başarısız oldu: Botun rol verme yetkisi yok veya verilecek rol botun rolünden daha üst sırada.');
                    }

                    return safeReply(interaction, 'Kayıt işlemi sırasında beklenmeyen bir hata oluştu.');
                }
            }

            // Oyun İstek Sistemi Butonları
            if (interaction.customId === 'approve_request' || interaction.customId === 'reject_request') {
                const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
                if (!isAdmin) {
                    return interaction.reply({ content: 'Bu işlemi sadece Yöneticiler gerçekleştirebilir.', flags: MessageFlags.Ephemeral });
                }

                const message = interaction.message;
                if (!message.embeds[0]) {
                    return interaction.reply({ content: 'İstek mesajı bozulmuş veya embed bulunamadı.', flags: MessageFlags.Ephemeral });
                }
                const embed = EmbedBuilder.from(message.embeds[0]);

                if (interaction.customId === 'approve_request') {
                    embed.setColor('#00FF00'); // Green
                    embed.addFields({ name: 'Durum', value: '✅ ONAYLANDI', inline: false });
                    embed.setFooter({ text: `Onaylayan: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                    await message.edit({ embeds: [embed], components: [] });
                    await interaction.reply({ content: '✅ İstek başarıyla onaylandı.', flags: MessageFlags.Ephemeral });

                    // Log onayı
                    const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎮 Oyun İsteği Onaylandı')
                            .setColor('#00FF00')
                            .setDescription(`Yetkili ${interaction.user}, bir oyun isteğini onayladı.`)
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] }).catch(() => null);
                    }
                } else if (interaction.customId === 'reject_request') {
                    // Modal göster
                    const modal = new ModalBuilder()
                        .setCustomId('reject_modal')
                        .setTitle('İstek Reddetme');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('reject_reason')
                        .setLabel('Reddetme Sebebi (Zorunlu)')
                        .setPlaceholder('Oyun çok pahalı, kütüphanede var vb.')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(500);

                    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
                    modal.addComponents(actionRow);

                    await interaction.showModal(modal);
                }
            }

            // Gelişmiş Çekiliş Sistemi Butonları
            if (interaction.customId.startsWith('gw_join_')) {
                const gwId = interaction.customId.replace('gw_join_', '');
                const gwData = (interaction.client as any).giveaways.get(gwId);
                
                if (!gwData || gwData.cancelled) {
                    return interaction.reply({ content: 'Bu çekiliş artık aktif değil veya sona ermiş!', flags: MessageFlags.Ephemeral });
                }

                if (gwData.participants.has(interaction.user.id)) {
                    return interaction.reply({ content: 'Bu çekilişe zaten katıldınız! Sonuçları bekleyin.', flags: MessageFlags.Ephemeral });
                }

                // Katılımcıyı ekle
                gwData.participants.add(interaction.user.id);
                
                // Embed altındaki katılımcı sayısını güncelle
                const message = interaction.message;
                
                // Footer text formatı: "X Dakika Sürecek | Katılımcı: 0"
                if (message.embeds[0]?.footer?.text) {
                    const embed = EmbedBuilder.from(message.embeds[0]);
                    const newFooter = message.embeds[0].footer.text.replace(/Katılımcı: \d+/, `Katılımcı: ${gwData.participants.size}`);
                    embed.setFooter({ text: newFooter });
                    await message.edit({ embeds: [embed] }).catch(() => null);
                }
                
                await interaction.reply({ content: '🎉 Çekilişe başarıyla katıldınız! Bol şans.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId.startsWith('gw_cancel_')) {
                const isAdmin = (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || interaction.memberPermissions?.has(PermissionFlagsBits.ManageEvents)) ?? false;
                if (!isAdmin) {
                    return interaction.reply({ content: 'Çekilişi iptal etme yetkiniz yok (Sadece Yöneticiler).', flags: MessageFlags.Ephemeral });
                }

                const gwId = interaction.customId.replace('gw_cancel_', '');
                const gwData = (interaction.client as any).giveaways.get(gwId);
                
                if (!gwData || gwData.cancelled) {
                    return interaction.reply({ content: 'Bu çekiliş zaten iptal edilmiş veya sona ermiş.', flags: MessageFlags.Ephemeral });
                }

                gwData.cancelled = true;

                const message = interaction.message;
                const embed = (message.embeds[0] ? EmbedBuilder.from(message.embeds[0]) : new EmbedBuilder())
                    .setTitle('🛑 ÇEKİLİŞ İPTAL EDİLDİ 🛑')
                    .setColor('#FF0000')
                    .setDescription(`**Ödül:** ${gwData.prize}\n\n*Bu çekiliş bir yetkili tarafından iptal edilmiştir.*`)
                    .setFooter({ text: `İptal Eden: ${interaction.user.tag}` })
                    .setTimestamp(new Date());

                // Butonları kaldır
                await message.edit({ embeds: [embed], components: [] });
                await interaction.reply({ content: '✅ Çekiliş başarıyla iptal edildi.', flags: MessageFlags.Ephemeral });
                
                // Log the cancellation
                const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🛑 Çekiliş İptal Edildi')
                        .setColor('#FF0000')
                        .addFields(
                            { name: 'Ödül', value: gwData.prize, inline: true },
                            { name: 'İptal Eden', value: `${interaction.user}`, inline: true }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] }).catch(() => null);
                }

                (interaction.client as any).giveaways.delete(gwId);
            }

            if (interaction.customId.startsWith('gw_manual_pick_')) {
                const gwId = interaction.customId.replace('gw_manual_pick_', '');
                const gwData = (interaction.client as any).giveaways.get(gwId);

                if (!gwData) {
                    return interaction.reply({ content: 'Bu çekilişin verisi bulunamadı veya çoktan sonuçlanmış.', flags: MessageFlags.Ephemeral });
                }

                if (interaction.user.id !== gwData.hostId && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: 'Sadece çekilişi başlatan kişi veya yöneticiler kazananı seçebilir.', flags: MessageFlags.Ephemeral });
                }

                const maxSelect = Math.min(gwData.winnerCount, gwData.participants.size);
                if (maxSelect < 1) {
                    return interaction.reply({ content: 'Bu çekilişe kimse katılmadığı için kazanan seçilemez.', flags: MessageFlags.Ephemeral });
                }

                const { UserSelectMenuBuilder } = require('discord.js');
                const selectMenu = new UserSelectMenuBuilder()
                    .setCustomId(`gw_select_winners_${gwId}`)
                    .setPlaceholder(`${maxSelect} kazanan seçin...`)
                    .setMinValues(1)
                    .setMaxValues(maxSelect);

                const row = new ActionRowBuilder<any>().addComponents(selectMenu);
                await interaction.reply({ content: `Lütfen kazanan kişiyi/kişileri seçin (${maxSelect} kişi seçebilirsiniz):`, components: [row], flags: MessageFlags.Ephemeral });
            }
        } // <-- End of isButton

        // --- 4. HANDLE SELECT MENUS ---
        if (interaction.isUserSelectMenu()) {
            if (interaction.customId.startsWith('gw_select_winners_')) {
                const gwId = interaction.customId.replace('gw_select_winners_', '');
                const gwData = (interaction.client as any).giveaways.get(gwId);

                if (!gwData) {
                    return interaction.reply({ content: 'Çekiliş bulunamadı veya çoktan sonuçlandı.', flags: MessageFlags.Ephemeral });
                }

                const selectedUsers = interaction.users; // Collection of selected users
                const winnersText = selectedUsers.map(u => `<@${u.id}>`).join(', ');

                // Orijinal çekiliş mesajını bul ve güncelle
                const channel = interaction.client.channels.cache.get(gwData.channelId) as any;
                if (channel) {
                    const giveawayMessage = await channel.messages.fetch(gwData.messageId).catch(() => null);
                    if (giveawayMessage) {
                        const endEmbed = (giveawayMessage.embeds[0] ? EmbedBuilder.from(giveawayMessage.embeds[0]) : new EmbedBuilder())
                            .setTitle('🎉 ÇEKİLİŞ SONA ERDİ (MANUEL)! 🎉')
                            .setColor('#333333')
                            .setDescription(`**Ödül:** ${gwData.prize}\n\n**Kazananlar:** ${winnersText}\n*Bu kazananlar yönetici tarafından özel olarak seçilmiştir.*`)
                            .setFooter({ text: `Sona Erdi | Toplam Katılımcı: ${gwData.participants.size}` })
                            .setTimestamp(new Date());

                        await giveawayMessage.edit({ embeds: [endEmbed] });
                    }
                    
                    // Kanala duyuru at
                    await channel.send(`🎊 Tebrikler ${winnersText}! Yönetici tarafından **${gwData.prize}** ödülü için seçildiniz!`);
                }

                await interaction.reply({ content: '✅ Kazananlar başarıyla seçildi ve duyuruldu!', flags: MessageFlags.Ephemeral });
                
                // İlk çıkan butonu içeren mesajı silebilirsek güzel olur ama ephemeral olduğu için gerek yok
                
                // Memory'den temizle
                (interaction.client as any).giveaways.delete(gwId);
            }
        }

        
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
            const val = interaction.values[0];
            if (val === 'ticket_reset') return interaction.reply({ content: 'Seçim sıfırlandı.', flags: MessageFlags.Ephemeral });

            let cat = 'destek';
            if (val === 'ticket_genel') cat = 'genel-sorular';
            else if (val === 'ticket_teknik') cat = 'teknik-destek';
            else if (val === 'ticket_satin') cat = 'satin-alim';
            

            const rawUsername = interaction.user.username.replace(/[^a-z0-9]/gi, '').toLowerCase();
            const safeUsername = rawUsername.length > 0 ? rawUsername : interaction.user.id;
            const name = `${cat}-${safeUsername}`;

            try {
                if (!interaction.guild || !interaction.channel || !('parentId' in interaction.channel)) {
                    return interaction.reply({ content: 'Bu komut sadece sunucu içindeki metin kanallarında çalışır.', flags: MessageFlags.Ephemeral });
                }

                // Kanal oluşturma 3 saniyeyi aşabilir; etkileşim zaman aşımına düşmesin diye önce erteliyoruz
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const overwrites: any[] = [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { 
                        id: interaction.user.id, 
                        allow: [
                            PermissionFlagsBits.ViewChannel, 
                            PermissionFlagsBits.SendMessages, 
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks
                        ] 
                    },
                    { 
                        id: interaction.client.user.id, 
                        allow: [
                            PermissionFlagsBits.ViewChannel, 
                            PermissionFlagsBits.SendMessages, 
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks
                        ] 
                    }
                ];

                if (CONFIG.ROLES.FOUNDER) {
                    overwrites.push({
                        id: CONFIG.ROLES.FOUNDER,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks
                        ]
                    });
                }

                if (CONFIG.ROLES.CO_FOUNDER) {
                    overwrites.push({
                        id: CONFIG.ROLES.CO_FOUNDER,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks
                        ]
                    });
                }

                const ch = await interaction.guild.channels.create({
                    name,
                    type: 0,
                    topic: `ticket-owner:${interaction.user.id} | ${interaction.user.tag}`,
                    parent: (interaction.channel as any).parentId as string,
                    permissionOverwrites: overwrites
                });

                if (ch) {
                    const { ButtonBuilder, ButtonStyle, ActionRowBuilder: LocalActionRowBuilder } = require('discord.js');
                    const closeBtn = new LocalActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('Talebi Kapat').setEmoji('🔒').setStyle(ButtonStyle.Danger)
                    );
                    
                    const emb = new EmbedBuilder()
                        .setTitle('Destek Talebi')
                        .setDescription('Merhaba <@' + interaction.user.id + '>, yetkililer en kısa sürede seninle ilgilenecektir.\n**Kategori:** ' + cat)
                        .setColor('#2F3136');

                    await ch.send({ content: '<@' + interaction.user.id + '>', embeds: [emb], components: [closeBtn] });
                    await interaction.editReply({ content: '✅ Destek talebiniz oluşturuldu: <#' + ch.id + '>' });
                    return;
                }
            } catch (e) {
                console.error('[ERROR] Ticket oluşturma hatası:', e);
                if (interaction.deferred) {
                    await interaction.editReply({ content: '❌ Destek talebi oluşturulamadı. Botun kanal oluşturma yetkisini kontrol edin.' }).catch(() => null);
                } else {
                    await safeReply(interaction, '❌ Destek talebi oluşturulamadı.');
                }
                return;
            }
        }
// --- 3. HANDLE MODAL SUBMITS ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'reject_modal') {
                const reason = interaction.fields.getTextInputValue('reject_reason');
                
                const message = interaction.message;
                if (!message) {
                    return interaction.reply({ content: 'Mesaj bulunamadı, işlem iptal edildi.', flags: MessageFlags.Ephemeral });
                }

                if (!message.embeds[0]) {
                    return interaction.reply({ content: 'İstek mesajının içeriği bulunamadı.', flags: MessageFlags.Ephemeral });
                }
                const embed = EmbedBuilder.from(message.embeds[0]);
                embed.setColor('#FF0000'); // Red
                embed.addFields(
                    { name: 'Durum', value: '❌ REDDEDİLDİ', inline: false },
                    { name: 'Reddetme Sebebi', value: `> ${truncate(reason, 1000)}`, inline: false }
                );
                embed.setFooter({ text: `Reddeden: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                
                await message.edit({ embeds: [embed], components: [] });
                await interaction.reply({ content: '❌ İstek başarıyla reddedildi ve sebep yazıldı.', flags: MessageFlags.Ephemeral });

                // Log reddi
                const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🎮 Oyun İsteği Reddedildi')
                        .setColor('#FF0000')
                        .setDescription(`Yetkili ${interaction.user}, bir oyun isteğini reddetti.\n\n**Sebep:** ${reason}`)
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] }).catch(() => null);
                }
            }
        }

}
