const ADMIN_ROLE_IDS = [
    '1429197885139980348', // Cm
    '1436501239599992985', // LeadAdmin
    '1436484272101003386', // Responsible
    '1429135690808954950'  // Administrator
];

const MODERATION_ROLE_IDS = [
    '1429135693434851591', // Moderator
    '1429135695859155064'  // Helper
];

function hasAdminPermission(member) {
    if (!member || !member.roles) return false;

    return member.roles.cache.some(role =>
        ADMIN_ROLE_IDS.includes(role.id)
    );
}

function hasModerationPermission(member) {
    if (!member || !member.roles) return false;

    return member.roles.cache.some(role =>
        ADMIN_ROLE_IDS.includes(role.id) ||
        MODERATION_ROLE_IDS.includes(role.id)
    );
}

module.exports = {
    ADMIN_ROLE_IDS,
    MODERATION_ROLE_IDS,
    hasAdminPermission,
    hasModerationPermission
};