"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Kanalı siler ve aynı ayarlarla yeniden oluşturur (Tüm mesajlar silinir).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        const channel = interaction.channel;
        // Komutu kullanan kişiye hemen cevap ver
        await interaction.reply({ content: '💣 Kanal imha ediliyor...', ephemeral: true });
        try {
            // Kanalın kopyasını oluştur
            const clonedChannel = await channel.clone({
                position: channel.position,
                reason: `${interaction.user.tag} tarafından Nuke atıldı.`
            });
            // Eski kanalı sil
            await channel.delete();
            // Yeni kanala bilgi mesajı at
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle('💣 KANAL SIFIRLANDI (NUKE)')
                .setDescription(`Bu kanal **${interaction.user}** tarafından başarıyla sıfırlandı.\nTüm eski mesajlar kalıcı olarak silindi.`)
                .setColor('#FF0000')
                .setImage('https://i.gifer.com/6Ip.gif') // Şık bir nuke gifi
                .setTimestamp();
            await clonedChannel.send({ embeds: [embed] });
        }
        catch (error) {
            console.error('[ERROR] /nuke command:', error);
            // Eğer kanal silinemediyse hala eski kanaldadır, oraya hata atabiliriz
            interaction.followUp({ content: 'Kanal sıfırlanırken bir hata oluştu! Botun "Kanalları Yönet" yetkisini kontrol edin.', ephemeral: true }).catch(() => null);
        }
    }
};
