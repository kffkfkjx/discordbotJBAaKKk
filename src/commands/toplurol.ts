import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toplurol')
        .setDescription('Belirtilen rolü sunucudaki (bot olmayan) herkese verir (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option => option.setName('rol').setDescription('Dağıtılacak rolü seçin').setRequired(true)),
        
    async execute(interaction: ChatInputCommandInteraction) {
        const role = interaction.options.getRole('rol', true);
        
        await interaction.reply({ content: `⏳ Toplu rol dağıtımı başlatılıyor: **${role.name}**. Üye sayısına göre bu işlem biraz sürebilir...`, ephemeral: true });

        const members = await interaction.guild?.members.fetch();
        if (!members) {
            return interaction.followUp({ content: 'Üye listesi alınamadı.', ephemeral: true });
        }

        // Filtre: Gerçek kullanıcılar ve o role halihazırda sahip OLMAYANLAR
        const targetUsers = members.filter(m => !m.user.bot && !m.roles.cache.has(role.id));
        
        let success = 0;
        let fail = 0;
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (const [_, member] of targetUsers) {
            try {
                await member.roles.add(role.id as string);
                success++;
            } catch (error) {
                fail++;
            }
            await delay(1000); // Anti-ratelimit: Her rol vermede 1 saniye bekle
        }

        await interaction.followUp({ 
            content: `✅ **Toplu Rol Verme Tamamlandı!**\n- 🟢 Başarıyla Verilen: **${success}**\n- 🔴 Başarısız/Yetki Yetmeyen: **${fail}**`, 
            ephemeral: true 
        });

        // Log the action
        const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🔰 Toplu Rol Dağıtıldı')
                .setColor('#FFFF00')
                .addFields(
                    { name: 'Rol', value: `${role}`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user}`, inline: true },
                    { name: 'Sonuç', value: `Başarılı: ${success} | Başarısız: ${fail}`, inline: false }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        }
    }
};
