import { Events, Interaction, Client, GuildMember, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction, client: Client) {
        
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
                    const argsString = args.length > 0 ? args : 'Parametre yok (Boş)';

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
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true });
                }
            }
            return;
        }

        // --- 2. HANDLE BUTTON INTERACTIONS ---
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            const isAdmin = (interaction.member as GuildMember).permissions.has(PermissionFlagsBits.Administrator);
            if (!isAdmin) {
                return interaction.reply({ content: 'Bu bileti sadece yöneticiler kapatabilir!', ephemeral: true });
            }

            await interaction.reply({ content: '🔒 Ticket kapatılıyor... Arşiv (log) hazırlanıyor.' });

            try {
                if (interaction.channel) {
                    const messages = await interaction.channel.messages.fetch({ limit: 100 });
                    const msgsArray = Array.from(messages.values()).reverse();
                    
                    let transcript = `--- TICKET LOG (${(interaction.channel as any).name}) ---\n\n`;
                    msgsArray.forEach(m => {
                        const date = new Date(m.createdTimestamp).toLocaleString('tr-TR');
                        transcript += `[${date}] ${m.author.tag}: ${m.content}\n`;
                    });

                    const { AttachmentBuilder } = require('discord.js');
                    const transcriptAttachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `${(interaction.channel as any).name}-log.txt` });

                    const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.TICKET_LOG_CHANNEL);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎫 Ticket Kapatıldı ve Arşivlendi')
                            .setColor('#FF0000')
                            .addFields(
                                { name: 'Kapatan Yetkili', value: `<@${interaction.user.id}>`, inline: true },
                                { name: 'Ticket Adı', value: `${(interaction.channel as any).name}`, inline: true }
                            )
                            .setTimestamp();
                        await (logChannel as any).send({ embeds: [logEmbed], files: [transcriptAttachment] }).catch(()=>null);
                    }
                    
                    setTimeout(() => {
                        if (interaction.channel) interaction.channel.delete().catch(()=>null);
                    }, 4000);
                }
            } catch (err) {
                console.error('[ERROR] Ticket loglama hatası:', err);
                if (interaction.channel) interaction.channel.delete().catch(()=>null);
            }
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
                            ephemeral: true 
                        });
                    }

                    // Account is old enough, assign the Member role
                    const member = interaction.member as GuildMember;
                    
                    // Check if they already have the role
                    if (member.roles.cache.has(CONFIG.ROLES.MEMBER)) {
                        return interaction.reply({ 
                            content: 'Zaten kayıtlısınız.', 
                            ephemeral: true 
                        });
                    }

                    // Try adding the role
                    await member.roles.add(CONFIG.ROLES.MEMBER);
                    
                    // Log to the specified channel
                    const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
                    if (logChannel) {
                        await logChannel.send({
                            content: `✅ ${interaction.user} başarıyla kayıt oldu ve **Üye** rolü verildi.`
                        });
                    }

                    return interaction.reply({ 
                        content: 'Başarıyla kayıt oldunuz.', 
                        ephemeral: true 
                    });

                } catch (error) {
                    console.error('[ERROR] Failed to handle register_button:', error);
                    
                    // Specific error handling for permission issues
                    if (error instanceof Error && error.message.includes('Missing Permissions')) {
                        return interaction.reply({ 
                            content: 'Kayıt işlemi başarısız oldu: Botun rol verme yetkisi yok veya verilecek rol botun rolünden daha üst sırada.', 
                            ephemeral: true 
                        });
                    }

                    return interaction.reply({ 
                        content: 'Kayıt işlemi sırasında beklenmeyen bir hata oluştu.', 
                        ephemeral: true 
                    });
                }
            }

            // Oyun İstek Sistemi Butonları
            if (interaction.customId === 'approve_request' || interaction.customId === 'reject_request') {
                const isAdmin = (interaction.member as GuildMember).permissions.has(PermissionFlagsBits.Administrator);
                if (!isAdmin) {
                    return interaction.reply({ content: 'Bu işlemi sadece Yöneticiler gerçekleştirebilir.', ephemeral: true });
                }

                const message = interaction.message;
                const embed = EmbedBuilder.from(message.embeds[0]);

                if (interaction.customId === 'approve_request') {
                    embed.setColor('#00FF00'); // Green
                    embed.addFields({ name: 'Durum', value: '✅ ONAYLANDI', inline: false });
                    embed.setFooter({ text: `Onaylayan: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                    await message.edit({ embeds: [embed], components: [] });
                    await interaction.reply({ content: '✅ İstek başarıyla onaylandı.', ephemeral: true });

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
                    return interaction.reply({ content: 'Bu çekiliş artık aktif değil veya sona ermiş!', ephemeral: true });
                }

                if (gwData.participants.has(interaction.user.id)) {
                    return interaction.reply({ content: 'Bu çekilişe zaten katıldınız! Sonuçları bekleyin.', ephemeral: true });
                }

                // Katılımcıyı ekle
                gwData.participants.add(interaction.user.id);
                
                // Embed altındaki katılımcı sayısını güncelle
                const message = interaction.message;
                const embed = EmbedBuilder.from(message.embeds[0]);
                
                // Footer text formatı: "X Dakika Sürecek | Katılımcı: 0"
                if (embed.data.footer && embed.data.footer.text) {
                    const newFooter = embed.data.footer.text.replace(/Katılımcı: \d+/, `Katılımcı: ${gwData.participants.size}`);
                    embed.setFooter({ text: newFooter });
                    await message.edit({ embeds: [embed] });
                }
                
                await interaction.reply({ content: '🎉 Çekilişe başarıyla katıldınız! Bol şans.', ephemeral: true });
            }

            if (interaction.customId.startsWith('gw_cancel_')) {
                const isAdmin = (interaction.member as GuildMember).permissions.has(PermissionFlagsBits.Administrator) || (interaction.member as GuildMember).permissions.has(PermissionFlagsBits.ManageEvents);
                if (!isAdmin) {
                    return interaction.reply({ content: 'Çekilişi iptal etme yetkiniz yok (Sadece Yöneticiler).', ephemeral: true });
                }

                const gwId = interaction.customId.replace('gw_cancel_', '');
                const gwData = (interaction.client as any).giveaways.get(gwId);
                
                if (!gwData || gwData.cancelled) {
                    return interaction.reply({ content: 'Bu çekiliş zaten iptal edilmiş veya sona ermiş.', ephemeral: true });
                }

                gwData.cancelled = true;

                const message = interaction.message;
                const embed = EmbedBuilder.from(message.embeds[0])
                    .setTitle('🛑 ÇEKİLİŞ İPTAL EDİLDİ 🛑')
                    .setColor('#FF0000')
                    .setDescription(`**Ödül:** ${gwData.prize}\n\n*Bu çekiliş bir yetkili tarafından iptal edilmiştir.*`)
                    .setFooter({ text: `İptal Eden: ${interaction.user.tag}` })
                    .setTimestamp(new Date());

                // Butonları kaldır
                await message.edit({ embeds: [embed], components: [] });
                await interaction.reply({ content: '✅ Çekiliş başarıyla iptal edildi.', ephemeral: true });
                
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
                    return interaction.reply({ content: 'Bu çekilişin verisi bulunamadı veya çoktan sonuçlanmış.', ephemeral: true });
                }

                if (interaction.user.id !== gwData.hostId && !(interaction.member as GuildMember).permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: 'Sadece çekilişi başlatan kişi veya yöneticiler kazananı seçebilir.', ephemeral: true });
                }

                const maxSelect = Math.min(gwData.winnerCount, gwData.participants.size);

                const { UserSelectMenuBuilder } = require('discord.js');
                const selectMenu = new UserSelectMenuBuilder()
                    .setCustomId(`gw_select_winners_${gwId}`)
                    .setPlaceholder(`${maxSelect} kazanan seçin...`)
                    .setMinValues(1)
                    .setMaxValues(maxSelect);

                const row = new ActionRowBuilder<any>().addComponents(selectMenu);
                await interaction.reply({ content: `Lütfen kazanan kişiyi/kişileri seçin (${maxSelect} kişi seçebilirsiniz):`, components: [row], ephemeral: true });
            }
        } // <-- End of isButton

        // --- 4. HANDLE SELECT MENUS ---
        if (interaction.isUserSelectMenu()) {
            if (interaction.customId.startsWith('gw_select_winners_')) {
                const gwId = interaction.customId.replace('gw_select_winners_', '');
                const gwData = (interaction.client as any).giveaways.get(gwId);

                if (!gwData) {
                    return interaction.reply({ content: 'Çekiliş bulunamadı veya çoktan sonuçlandı.', ephemeral: true });
                }

                const selectedUsers = interaction.users; // Collection of selected users
                const winnersText = selectedUsers.map(u => `<@${u.id}>`).join(', ');

                // Orijinal çekiliş mesajını bul ve güncelle
                const channel = interaction.client.channels.cache.get(gwData.channelId) as any;
                if (channel) {
                    const giveawayMessage = await channel.messages.fetch(gwData.messageId).catch(() => null);
                    if (giveawayMessage) {
                        const endEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
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

                await interaction.reply({ content: '✅ Kazananlar başarıyla seçildi ve duyuruldu!', ephemeral: true });
                
                // İlk çıkan butonu içeren mesajı silebilirsek güzel olur ama ephemeral olduğu için gerek yok
                
                // Memory'den temizle
                (interaction.client as any).giveaways.delete(gwId);
            }
        }

        
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
            const val = interaction.values[0];
            if (val === 'ticket_reset') return interaction.reply({ content: 'Seçim sıfırlandı.', ephemeral: true });

            let cat = 'destek';
            if (val === 'ticket_genel') cat = 'genel-sorular';
            else if (val === 'ticket_teknik') cat = 'teknik-destek';
            else if (val === 'ticket_satin') cat = 'satin-alim';
            

            const name = cat + '-' + interaction.user.username.replace(/[^a-z0-9]/gi, '');

            try {
                if (!interaction.guild || !interaction.channel || !('parentId' in interaction.channel)) {
                    return interaction.reply({ content: 'Bu komut sadece sunucu içindeki metin kanallarında çalışır.', ephemeral: true });
                }

                const ch = await interaction.guild.channels.create({
                    name,
                    type: 0,
                    parent: interaction.channel.parentId as string,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                    ]
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
                    return interaction.reply({ content: '✅ Destek talebiniz oluşturuldu: <#' + ch.id + '>', ephemeral: true });
                }
            } catch (e) {
                console.error(e);
                return interaction.reply({ content: 'Hata oluştu.', ephemeral: true });
            }
        }
// --- 3. HANDLE MODAL SUBMITS ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'reject_modal') {
                const reason = interaction.fields.getTextInputValue('reject_reason');
                
                const message = interaction.message;
                if (!message) {
                    return interaction.reply({ content: 'Mesaj bulunamadı, işlem iptal edildi.', ephemeral: true });
                }

                const embed = EmbedBuilder.from(message.embeds[0]);
                embed.setColor('#FF0000'); // Red
                embed.addFields(
                    { name: 'Durum', value: '❌ REDDEDİLDİ', inline: false },
                    { name: 'Reddetme Sebebi', value: `> ${reason}`, inline: false }
                );
                embed.setFooter({ text: `Reddeden: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
                
                await message.edit({ embeds: [embed], components: [] });
                await interaction.reply({ content: '❌ İstek başarıyla reddedildi ve sebep yazıldı.', ephemeral: true });

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

    },
};
