/**
 * Security Infrastructure
 *
 * Runtime security monitoring and telemetry.
 * See telemetry.ts for detailed documentation.
 */

export {
    isServiceRoleJWT, recordAdminBypassAttempt, recordAuthFailure, recordEventSpam, recordRateLimitHit, recordSecurityEvent,
    reportServiceRoleAttempt, type SecurityEvent, type SecurityEventType
} from "./telemetry";

