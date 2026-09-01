"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("../config");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('setup')
        .setDescription('Kayıt sistemini kurar ve kayıt butonunu gönderir. (Sadece Yöneticiler)'),
    async execute(interaction) {
        const member = interaction.member;
        // Check for Founder or Co-Founder roles
        const hasPermission = member.roles.cache.has(config_1.CONFIG.ROLES.FOUNDER) ||
            member.roles.cache.has(config_1.CONFIG.ROLES.CO_FOUNDER);
        if (!hasPermission) {
            return interaction.reply({
                content: 'Bu komutu kullanmak için gerekli yetkiye (Founder veya Co-founder) sahip değilsiniz.',
                ephemeral: true
            });
        }
        // Create elegant embed
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('🚀 Sunucuya Hoş Geldiniz')
            .setDescription('Sunucuya erişmek için aşağıdaki butona tıklayarak kayıt olabilirsiniz.\n\n*Not: Hesabınızın kayıt olabilmesi için en az 1 aylık (30 günlük) olması gerekmektedir.*')
            .setColor('#2b2d31') // Discord's elegant dark gray color
            .setTimestamp();
        // Create register button
        const registerButton = new discord_js_1.ButtonBuilder()
            .setCustomId('register_button')
            .setLabel('Kayıt Ol')
            .setEmoji('📝')
            .setStyle(discord_js_1.ButtonStyle.Success);
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(registerButton);
        // Fetch the target channel
        const targetChannel = interaction.client.channels.cache.get(config_1.CONFIG.CHANNELS.TARGET_CHANNEL);
        if (!targetChannel) {
            return interaction.reply({
                content: 'Hedef kanal bulunamadı. Lütfen config.ts dosyasındaki ID\'yi kontrol edin.',
                ephemeral: true
            });
        }
        // Send the setup message to the specific channel
        await targetChannel.send({ embeds: [embed], components: [row] });
        // Acknowledge the command execution privately
        await interaction.reply({
            content: `Kayıt sistemi başarıyla <#${config_1.CONFIG.CHANNELS.TARGET_CHANNEL}> kanalına kuruldu.`,
            ephemeral: true
        });
    },
};
