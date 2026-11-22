package com.scouthub.auth;

import com.scouthub.auth.dto.AuthDtos.AuthResponse;
import com.scouthub.auth.dto.AuthDtos.ChangePasswordRequest;
import com.scouthub.auth.dto.AuthDtos.LoginRequest;
import com.scouthub.auth.dto.AuthDtos.RegisterRequest;
import com.scouthub.auth.dto.AuthDtos.UpdateProfileRequest;
import com.scouthub.auth.dto.AuthDtos.UpdateUserRequest;
import com.scouthub.auth.dto.AuthDtos.UserResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Registration, login, own profile, and user administration. */
@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final Clock clock;
    /** Hash checked when the email is unknown, so a login takes the same time whether the account exists or not. */
    private final String dummyHash;

    @Autowired
    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this(users, encoder, jwt, Clock.systemUTC());
    }

    AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, Clock clock) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.clock = clock;
        this.dummyHash = encoder.encode("timing-equaliser");
    }

    /** Self-registration always creates a SCOUT; other roles are granted by an administrator. */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalise(request.email());
        if (users.existsByEmail(email)) {
            throw AuthException.emailTaken();
        }
        User user = new User(email, encoder.encode(request.password()), blankToNull(request.fullName()), Role.DEFAULT);
        user.setLastLoginAt(now());
        try {
            user = users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw AuthException.emailTaken(); // two registrations raced on the same email
        }
        return tokenFor(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(normalise(request.email())).orElse(null);
        if (user == null) {
            encoder.matches(request.password(), dummyHash);
            throw AuthException.invalidCredentials();
        }
        if (!encoder.matches(request.password(), user.getPasswordHash())) {
            throw AuthException.invalidCredentials();
        }
        if (!user.isEnabled()) {
            throw AuthException.disabled();
        }
        user.setLastLoginAt(now());
        return tokenFor(user);
    }

    @Transactional(readOnly = true)
    public UserResponse me(String email) {
        return UserResponse.of(find(email));
    }

    @Transactional
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = find(email);
        user.setFullName(blankToNull(request.fullName()));
        return UserResponse.of(user);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = find(email);
        if (!encoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw AuthException.wrongCurrentPassword();
        }
        user.setPasswordHash(encoder.encode(request.newPassword()));
    }

    // ── administration ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers(String query, Role role) {
        String text = query == null ? "" : query.trim();
        return users.search(text, role).stream().map(UserResponse::of).toList();
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request, String actingEmail) {
        User user = users.findById(id).orElseThrow(AuthException::userNotFound);
        boolean changesRole = request.role() != null && request.role() != user.getRole();
        boolean disables = Boolean.FALSE.equals(request.enabled()) && user.isEnabled();
        if ((changesRole || disables) && user.getEmail().equalsIgnoreCase(actingEmail)) {
            // keeps at least the acting administrator able to log in and manage roles
            throw AuthException.cannotChangeSelf();
        }
        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (request.enabled() != null) {
            user.setEnabled(request.enabled());
        }
        return UserResponse.of(user);
    }

    // ── helpers ───────────────────────────────────────────────────────

    private User find(String email) {
        return users.findByEmail(email).orElseThrow(AuthException::userNotFound);
    }

    private AuthResponse tokenFor(User user) {
        JwtService.IssuedToken token = jwt.issue(user);
        return new AuthResponse(token.token(), token.expiresAt(), UserResponse.of(user));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    static String normalise(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
