"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
exports.CONFIG = {
    ROLES: {
        FOUNDER: '1469781233042067704',
        CO_FOUNDER: '1510734284040699994',
        MEMBER: '1469781258509746237'
    },
    CHANNELS: {
        TARGET_CHANNEL: '1469998209580404823', // Setup kanalının ID'si
        LOG_CHANNEL: '1469781548638142746' // Yeni Kayıt ve İşlem loglarının gideceği kanalın ID'si
    },
    AUTOMOD: {
        PROTECTED_CHANNELS: [
            '1469781461421785110',
            '1541035873024348221',
            '1469781482972123289',
            '1469781464668442820'
        ],
        SWEAR_WORDS: [
            'amk', 'aq', 'oç', 'piç', 'sg', 'sik', 'siktir', 'yavşak', 'amcık', 'orospu', 'kahpe',
            'yarrak', 'yarak', 'gavat', 'ibne', 'puşt', 'pezevenk', 'sikerim', 'sokarım', 'göt',
            'memesi', 'sürtük', 'amına', 'ananı', 'bacını', 'veled', 'veled-i zina', 'şerefsiz',
            'haysiyetsiz', 'köpek', 'it', 'mal', 'salak', 'gerizekalı', 'aptal', 'özürlü'
        ],
        AD_PATTERNS: [
            'discord.gg/', 'discord.com/invite', 't.me/', 'http://', 'https://', 'www.',
            '.com', '.net', '.org', '.xyz', 'twitch.tv/', 'youtube.com/', 'youtu.be/'
        ]
    },
    // Steam istek oyun kanalı
    REQUEST_CHANNEL: '1469781451955241011',
    // Required account age in days to register
    REQUIRED_ACCOUNT_AGE_DAYS: 30,
};
