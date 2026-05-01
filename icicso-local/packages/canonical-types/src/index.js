"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_EVENT_TYPES = exports.BASE_ROLES = void 0;
exports.BASE_ROLES = ["admin", "devops", "operator", "clinician", "auditor", "governance"];
exports.AUDIT_EVENT_TYPES = [
    "login",
    "login_failed",
    "logout",
    "create_case",
    "read_case",
    "document.ingested",
    "access_denied",
    "access_granted_sensitive",
    "privileged_action",
    "permission_changed",
    "role_changed",
    "backup_executed",
    "restore_executed",
    "config_changed",
];
//# sourceMappingURL=index.js.map