package com.scouthub.auth;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "test-secret-with-at-least-32-characters!";
    private static final Instant NOW = Instant.parse("2026-11-21T12:00:00Z");

    private static User user() {
        User u = new User("scout@scouthub.ma", "hash", "Scout", Role.SCOUT);
        u.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        return u;
    }

    private static JwtService at(Instant instant, String secret) {
        return new JwtService(secret, 3_600_000, Clock.fixed(instant, ZoneOffset.UTC));
    }

    @Test
    void issuedTokenVerifiesToTheEmail() {
        JwtService jwt = at(NOW, SECRET);
        JwtService.IssuedToken token = jwt.issue(user());

        assertThat(jwt.verify(token.token())).isEqualTo("scout@scouthub.ma");
        assertThat(token.expiresAt()).isEqualTo(NOW.plusSeconds(3600));
    }

    @Test
    void expiredTokenIsRejected() {
        String token = at(NOW, SECRET).issue(user()).token();

        assertThatThrownBy(() -> at(NOW.plusSeconds(3601), SECRET).verify(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        String token = at(NOW, "another-secret-with-at-least-32-chars!!").issue(user()).token();

        assertThatThrownBy(() -> at(NOW, SECRET).verify(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = at(NOW, SECRET).issue(user()).token();
        String[] parts = token.split("\\.");
        // swap the payload for one claiming another subject, keep the original signature
        String forged = parts[0] + "." + java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"iss\":\"scouthub\",\"sub\":\"admin@scouthub.ma\",\"exp\":9999999999}".getBytes())
                + "." + parts[2];

        assertThatThrownBy(() -> at(NOW, SECRET).verify(forged)).isInstanceOf(JwtException.class);
    }

    @Test
    void shortSecretIsRefusedAtStartup() {
        assertThatThrownBy(() -> at(NOW, "too-short")).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 caractères");
    }
}
