import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topludm')
        .setDescription('Sunucudaki herkese DM (Özel Mesaj) gönderir (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName('mesaj').setDescription('Gönderilecek mesaj içeriği').setRequired(true)),
        
    async execute(interaction: ChatInputCommandInteraction) {
        // Komutu kullanan kişiye hemen cevap ver (15 saniye içinde cevap verilmezse hata verir)
        await interaction.reply({ content: 'Toplu DM işlemi başlatılıyor. Bu işlem sunucu boyutuna göre biraz zaman alabilir...', ephemeral: true });

        const message = interaction.options.getString('mesaj', true).replace(/\\n/g, '\n');
        
        // Üyeleri çek (Botlar hariç)
        const members = await interaction.guild?.members.fetch();
        if (!members) {
            return interaction.followUp({ content: 'Üye listesi alınamadı.', ephemeral: true });
        }

        const realUsers = members.filter(m => !m.user.bot);
        
        let basarili = 0;
        let basarisiz = 0;

        // Anti-Rate Limit: Discord API'den ban yememek için her mesaja 2 saniye gecikme koyuyoruz
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (const [_, member] of realUsers) {
            try {
                await member.send(`📣 **${interaction.guild?.name} Sunucusundan Duyuru:**\n\n${message}`);
                basarili++;
            } catch (error) {
                // Kullanıcının DM'leri kapalıysa buraya düşer
                basarisiz++;
            }
            await delay(1500); // 1.5 saniye bekle
        }

        // Bittiğinde komutu yazan kişiye bilgi ver
        await interaction.followUp({ 
            content: `✅ **Toplu DM Gönderimi Tamamlandı!**\n- 📩 Başarıyla gönderilen: **${basarili}**\n- 🚫 DM'si kapalı olan (Gönderilemeyen): **${basarisiz}**`, 
            ephemeral: true 
        });

        // Log the Mass DM action
        const logChannel = interaction.client.channels.cache.get(CONFIG.CHANNELS.LOG_CHANNEL) as any;
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('✉️ Toplu DM Gönderildi')
                .setColor('#2F3136')
                .addFields(
                    { name: 'Gönderen Yetkili', value: `${interaction.user}`, inline: true },
                    { name: 'Başarılı', value: `${basarili} kişi`, inline: true },
                    { name: 'Başarısız', value: `${basarisiz} kişi`, inline: true },
                    { name: 'Gönderilen Mesaj', value: `\`\`\`\n${message.substring(0, 1000)}\n\`\`\``, inline: false }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        }
    }
};
