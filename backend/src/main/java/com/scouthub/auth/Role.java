package com.scouthub.auth;

/**
 * Platform roles (CdC §5.1). A visitor is simply a request without a token.
 * Use them in controllers with {@code @PreAuthorize("hasRole('ANALYST')")}.
 */
public enum Role {
    ADMIN,
    ANALYST,
    SCOUT,
    RECRUITER;

    /** Role given to every self-registered account. */
    public static final Role DEFAULT = SCOUT;

    /** Spring Security authority name, e.g. {@code ROLE_ANALYST}. */
    public String authority() {
        return "ROLE_" + name();
    }
}
