package com.scouthub.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;

/**
 * Issues and verifies the HS256 access tokens.
 * <p>
 * Claims: {@code sub} = email (so {@code authentication.getName()} is the email everywhere),
 * {@code uid} = user id, {@code role} = role at issue time. The filter re-reads the role from the
 * database on every request, so a role change or a disabled account applies immediately.
 */
@Service
public class JwtService {

    static final String ISSUER = "scouthub";
    private static final String DEV_SECRET = "change_me_32_chars_minimum_here__";
    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey key;
    private final long expiryMs;
    private final Clock clock;

    @Autowired
    public JwtService(@Value("${jwt.secret}") String secret, @Value("${jwt.expiryMs}") long expiryMs) {
        this(secret, expiryMs, Clock.systemUTC());
    }

    JwtService(String secret, long expiryMs, Clock clock) {
        try {
            this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        } catch (WeakKeyException e) {
            throw new IllegalStateException("JWT_SECRET doit faire au moins 32 caractères (256 bits).", e);
        }
        if (DEV_SECRET.equals(secret)) {
            log.warn("JWT_SECRET utilise la valeur d'exemple : à remplacer en dehors du développement.");
        }
        this.expiryMs = expiryMs;
        this.clock = clock;
    }

    public IssuedToken issue(User user) {
        Instant now = clock.instant();
        Instant expiresAt = now.plusMillis(expiryMs);
        String token = Jwts.builder()
                .issuer(ISSUER)
                .subject(user.getEmail())
                .claim("uid", String.valueOf(user.getId()))
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiresAt);
    }

    /**
     * Returns the email (subject) of a valid token.
     *
     * @throws JwtException if the token is malformed, tampered with, expired or not ours
     */
    public String verify(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(ISSUER)
                .clock(() -> Date.from(clock.instant()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new JwtException("Jeton sans sujet");
        }
        return subject;
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }
}
