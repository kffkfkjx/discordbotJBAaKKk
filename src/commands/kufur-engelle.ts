import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, MessageFlags, EmbedBuilder } from 'discord.js';
import { CONFIG } from '../config';
import { updateDb } from '../db';
import { getSendableChannel } from '../utils';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('küfür-engelle')
        .setDescription('Bu kanalda küfür filtresini kapatır / tekrar açar (Sadece Yöneticiler).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('İşlem yapılacak kanal (boş bırakılırsa komutun kullanıldığı kanal).')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice)
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        // Varsayılan izin Discord tarafında kapatılabilir; ikinci bir güvenlik kontrolü
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Bu komutu sadece yöneticiler kullanabilir.', flags: MessageFlags.Ephemeral });
        }

        const channelId = interaction.options.getChannel('kanal')?.id ?? interaction.channelId;

        let nowDisabled = false;
        updateDb(db => {
            const list = new Set(db.swearFilterDisabledChannels ?? []);
            if (list.has(channelId)) {
                list.delete(channelId);
                nowDisabled = false;
            } else {
                list.add(channelId);
                nowDisabled = true;
            }
            db.swearFilterDisabledChannels = Array.from(list);
        });

        const content = nowDisabled
            ? `🔕 <#${channelId}> kanalında **küfür filtresi devre dışı bırakıldı.**\nTekrar açmak için aynı komutu bu kanalda yeniden kullanın.\n*(Reklam/link koruması aktif kalmaya devam eder.)*`
            : `🛡️ <#${channelId}> kanalında **küfür filtresi tekrar aktif edildi.**`;

        await interaction.reply({ content, flags: MessageFlags.Ephemeral });

        const logChannel = getSendableChannel(interaction.client, CONFIG.CHANNELS.LOG_CHANNEL);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle(nowDisabled ? '🔕 Küfür Filtresi Kapatıldı' : '🛡️ Küfür Filtresi Açıldı')
                .setColor(nowDisabled ? '#FFAA00' : '#00C853')
                .addFields(
                    { name: 'Kanal', value: `<#${channelId}>`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(() => null);
        }
    }
};
