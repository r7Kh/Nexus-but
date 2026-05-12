const staffStatsDB = require('../utils/staffStatsDB');
const { ADMIN_ROLE_IDS, MODERATION_ROLE_IDS } = require('../utils/permissions');

function isStaffMember(member) {
    if (!member || !member.roles) return false;

    return member.roles.cache.some(role =>
        ADMIN_ROLE_IDS.includes(role.id) ||
        MODERATION_ROLE_IDS.includes(role.id)
    );
}

module.exports = {
    name: 'voiceStateUpdate',
    once: false,

    execute(client, oldState, newState) {
        const member = newState.member || oldState.member;

        if (!member) return;
        if (member.user.bot) return;
        if (!isStaffMember(member)) return;

        const wasInVoice = Boolean(oldState.channelId);
        const isInVoice = Boolean(newState.channelId);

        if (!wasInVoice && isInVoice) {
            staffStatsDB.startVoice(member.id);
            return;
        }

        if (wasInVoice && !isInVoice) {
            staffStatsDB.stopVoice(member.id);
            return;
        }

        if (wasInVoice && isInVoice && oldState.channelId !== newState.channelId) {
            staffStatsDB.stopVoice(member.id);
            staffStatsDB.startVoice(member.id);
        }
    }
};