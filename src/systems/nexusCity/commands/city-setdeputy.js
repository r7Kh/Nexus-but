const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const CityPlayer = require('../models/CityPlayer');

const ALLOWED_ADMIN_ROLES = [
    '1429197885139980348', // Cm
    '1436501239599992985', // LeadAdmin
    '1436484272101003386'  // Responsible
];

const FACTIONS = {
    Police: {
        label: '🚓 الشرطة',
        baseRole: '1506050074009014313',
        leaderRole: '1506210787314634793',
        deputyRole: '1506210878402592858'
    },

    Gang: {
        label: '🕶️ العصابات',
        baseRole: '1506050734708494356',
        leaderRole: '1506214889834807467',
        deputyRole: '1506215060970934303'
    },

    Medical: {
        label: '🏥 الطب',
        baseRole: '1506050976837144706',
        leaderRole: '1506210965300056145',
        deputyRole: '1506211068068892672'
    },

    'Fire Department': {
        label: '🚒 الإطفاء',
        baseRole: '1506051184471969926',
        leaderRole: '1506211169860583464',
        deputyRole: '1506211254929195091'
    },

    'Cyber Security': {
        label: '💻 الأمن السيبراني',
        baseRole: '1506051347047383220',
        leaderRole: '1506211461054337054',
        deputyRole: '1506211541215739955'
    }
};

function hasPermission(member) {
    return ALLOWED_ADMIN_ROLES.some(roleId =>
        member.roles.cache.has(roleId)
    );
}

function getAllFactionRoles() {
    const roles = [];

    for (const faction of Object.values(FACTIONS)) {
        roles.push(faction.leaderRole, faction.deputyRole);
    }

    return roles;
}

async function removeOldLeadershipRoles(member) {
    for (const roleId of getAllFactionRoles()) {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId).catch(() => {});
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('city-setdeputy')
        .setDescription('تعيين نائب لفصيل داخل NEXUS CITY')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('الشخص الذي تريد تعيينه نائب')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('faction')
                .setDescription('اختر الفصيل')
                .setRequired(true)
                .addChoices(
                    { name: '🚓 الشرطة', value: 'Police' },
                    { name: '🕶️ العصابات', value: 'Gang' },
                    { name: '🏥 الطب', value: 'Medical' },
                    { name: '🚒 الإطفاء', value: 'Fire Department' },
                    { name: '💻 الأمن السيبراني', value: 'Cyber Security' }
                )
        ),

    async execute(interaction) {
        if (!hasPermission(interaction.member)) {
            return interaction.reply({
                content: '❌ هذا الأمر مخصص فقط لـ Cm / LeadAdmin / Responsible.',
                flags: 64
            });
        }

        const user = interaction.options.getUser('user');
        const factionKey = interaction.options.getString('faction');
        const faction = FACTIONS[factionKey];

        if (!faction) {
            return interaction.reply({
                content: '❌ الفصيل غير صحيح.',
                flags: 64
            });
        }

        const player = await CityPlayer.findOne({
            userId: user.id
        });

        if (!player) {
            return interaction.reply({
                content: '❌ هذا اللاعب لا يملك شخصية داخل NEXUS CITY.',
                flags: 64
            });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ لم أستطع العثور على العضو داخل السيرفر.',
                flags: 64
            });
        }

        await removeOldLeadershipRoles(member);

        if (!member.roles.cache.has(faction.baseRole)) {
            await member.roles.add(faction.baseRole).catch(() => {});
        }

        await member.roles.add(faction.deputyRole).catch(() => {});

        player.faction = factionKey;
        player.factionRank = 'Deputy';
        player.inDuty = false;

        await player.save();

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setTitle('🎖️ تم تعيين نائب فصيل')
            .setDescription(
                `تم تعيين ${user} كنائب داخل **NEXUS CITY**.\n\n` +
                `🏛️ الفصيل: **${faction.label}**\n` +
                `🎖️ الرتبة: **Deputy**\n\n` +
                `تم تحديث بياناته داخل MongoDB وإعطاؤه الرتب تلقائيًا.`
            )
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: 'NEXUS CITY • Faction Deputy' })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed]
        });
    }
};