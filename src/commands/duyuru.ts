import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('Özel ve şık bir embed ile duyuru yapmanızı sağlar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => option.setName('mesaj').setDescription('Duyuru metni (\\n yazarak alt satıra geçebilirsiniz)').setRequired(true))
        .addChannelOption(option => 
            option.setName('kanal')
                .setDescription('Duyurunun yapılacağı kanal (Boş bırakırsanız mevcut kanala atar)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),
        
    async execute(interaction: ChatInputCommandInteraction) {
        // \n yazılarını gerçek alt satıra çevir
        const message = interaction.options.getString('mesaj', true).replace(/\\n/g, '\n');
        
        // Kanal belirtilmemişse komutun kullanıldığı kanalı seç
        const targetChannel = (interaction.options.getChannel('kanal') || interaction.channel) as TextChannel;

        if (!targetChannel) {
            return interaction.reply({ content: 'Geçerli bir kanal bulunamadı.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('📢 Yeni Duyuru')
            .setDescription(message)
            .setColor('#2b2d31') // Uyumlu dark tema rengi
            .setTimestamp()
            .setFooter({ 
                text: interaction.guild?.name || 'Duyuru Sistemi', 
                iconURL: interaction.guild?.iconURL() || undefined 
            });

        try {
            await targetChannel.send({ embeds: [embed] });
            await interaction.reply({ content: `✅ Duyuru başarıyla ${targetChannel} kanalına gönderildi.`, ephemeral: true });
        } catch (error) {
            console.error('[ERROR] /duyuru command:', error);
            await interaction.reply({ content: 'Duyuru gönderilirken bir hata oluştu (Yetki eksikliği vb.).', ephemeral: true });
        }
    }
};
