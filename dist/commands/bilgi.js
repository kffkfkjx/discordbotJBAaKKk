"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('bilgi')
        .setDescription('Bir kullanıcının hesap ve sunucu detaylarını gösterir (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageMessages)
        .addUserOption(option => option.setName('kullanici').setDescription('Bilgisi alınacak kullanıcı (Boş bırakırsanız sizi gösterir)').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('kullanici') || interaction.user;
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle('👤 Kullanıcı Bilgileri')
            .setThumbnail(user.displayAvatarURL({ size: 1024 }))
            .setColor('#2b2d31')
            .addFields({ name: 'Kullanıcı Adı', value: user.tag, inline: true }, { name: 'Kullanıcı ID', value: user.id, inline: true }, { name: 'Hesap Kurulum Tarihi', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false }, { name: 'Sunucuya Katılım', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Şu an sunucuda değil', inline: false })
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
