"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('sustur')
        .setDescription('Bir kullanıcıya zaman aşımı (timeout) uygular (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => option.setName('kullanici').setDescription('Susturulacak kullanıcı').setRequired(true))
        .addIntegerOption(option => option.setName('sure')
        .setDescription('Susturma süresi')
        .setRequired(true)
        .addChoices({ name: '1 Dakika', value: 60 * 1000 }, { name: '5 Dakika', value: 5 * 60 * 1000 }, { name: '10 Dakika', value: 10 * 60 * 1000 }, { name: '1 Saat', value: 60 * 60 * 1000 }, { name: '1 Gün', value: 24 * 60 * 60 * 1000 }, { name: '1 Hafta', value: 7 * 24 * 60 * 60 * 1000 }))
        .addStringOption(option => option.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('kullanici', true);
        const duration = interaction.options.getInteger('sure', true);
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';
        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);
        if (!member) {
            return interaction.reply({ content: 'Bu kullanıcı sunucuda bulunamadı.', ephemeral: true });
        }
        try {
            await member.timeout(duration, reason);
            // Seçilen süreyi metne çevirme (Basit UI/UX için)
            const durationText = duration >= 3600000 ? `${duration / 3600000} Saat` : `${duration / 60000} Dakika`;
            await interaction.reply({
                content: `✅ ${user} kullanıcısı başarıyla **${durationText}** boyunca susturuldu.\n📝 **Sebep:** ${reason}`,
                ephemeral: true
            });
        }
        catch (error) {
            console.error('[ERROR] /sustur command:', error);
            await interaction.reply({
                content: 'Kullanıcıyı sustururken hata oluştu! Botun rolü, kullanıcının rolünden daha alt sırada olabilir.',
                ephemeral: true
            });
        }
    }
};
