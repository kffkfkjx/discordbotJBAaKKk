import { Client, Interaction, MessageFlags } from 'discord.js';

/**
 * Metni belirtilen uzunlukta keser (Discord embed alan limiti 1024 karakterdir).
 */
export function truncate(text: string | null | undefined, max = 1000): string {
    if (!text) return '';
    return text.length > max ? `${text.substring(0, max - 3)}...` : text;
}

/**
 * İçeriği güvenli bir kod bloğuna sarar. İçerik boşsa fallback döner.
 * İçerideki ``` karakterleri bloğu bozmasın diye kaçışlanır.
 */
export function codeBlock(content: string | null | undefined, fallback = '*İçerik yok veya okunamadı*', max = 1000): string {
    if (!content || content.trim().length === 0) return fallback;
    const safe = truncate(content, max).replace(/```/g, '`\u200b``');
    return `\`\`\`\n${safe}\n\`\`\``;
}

/**
 * ID ile mesaj gönderilebilir bir kanal döndürür, yoksa null.
 */
export function getSendableChannel(client: Client, channelId: string): any | null {
    const channel = client.channels.cache.get(channelId) as any;
    if (!channel || typeof channel.send !== 'function') return null;
    return channel;
}

/**
 * Etkileşime durumuna göre (reply / followUp) güvenli şekilde ephemeral yanıt verir.
 * Etkileşim süresi dolmuşsa veya zaten yanıtlanmışsa hata fırlatmaz.
 */
export async function safeReply(interaction: Interaction, content: string): Promise<void> {
    if (!interaction.isRepliable()) return;
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
    } catch {
        // Etkileşim süresi dolmuş olabilir (Unknown interaction) - sessizce yoksay
    }
}
