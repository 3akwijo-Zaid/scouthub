package com.scouthub.auth;

import com.scouthub.auth.dto.AuthDtos.AuthResponse;
import com.scouthub.auth.dto.AuthDtos.ChangePasswordRequest;
import com.scouthub.auth.dto.AuthDtos.LoginRequest;
import com.scouthub.auth.dto.AuthDtos.RegisterRequest;
import com.scouthub.auth.dto.AuthDtos.UpdateUserRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4); // low cost: fast tests
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-21T12:00:00Z"), ZoneOffset.UTC);
    private UserRepository users;
    private AuthService service;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        JwtService jwt = new JwtService("test-secret-with-at-least-32-characters!", 3_600_000, clock);
        service = new AuthService(users, encoder, jwt, clock);
        when(users.saveAndFlush(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
    }

    private User existing(String email, String password, Role role) {
        User u = new User(email, encoder.encode(password), null, role);
        u.setId(UUID.randomUUID());
        when(users.findByEmail(email)).thenReturn(Optional.of(u));
        return u;
    }

    @Test
    void registerCreatesAScoutWithNormalisedEmailAndHashedPassword() {
        AuthResponse response = service.register(new RegisterRequest("  Hakim@ScoutHub.MA ", "motdepasse1", " Hakim "));

        assertThat(response.token()).isNotBlank();
        assertThat(response.user().email()).isEqualTo("hakim@scouthub.ma");
        assertThat(response.user().role()).isEqualTo(Role.SCOUT);
        assertThat(response.user().fullName()).isEqualTo("Hakim");
    }

    @Test
    void registerRejectsAnEmailAlreadyUsed() {
        when(users.existsByEmail("hakim@scouthub.ma")).thenReturn(true);

        assertThatThrownBy(() -> service.register(new RegisterRequest("hakim@scouthub.ma", "motdepasse1", null)))
                .isInstanceOf(AuthException.class).hasMessageContaining("existe déjà");
    }

    @Test
    void loginReturnsATokenAndRecordsTheLoginTime() {
        User u = existing("scout@scouthub.ma", "motdepasse1", Role.SCOUT);

        AuthResponse response = service.login(new LoginRequest("Scout@ScoutHub.ma", "motdepasse1"));

        assertThat(response.token()).isNotBlank();
        assertThat(u.getLastLoginAt()).isNotNull();
    }

    @Test
    void loginGivesTheSameErrorForAWrongPasswordAndAnUnknownEmail() {
        existing("scout@scouthub.ma", "motdepasse1", Role.SCOUT);

        assertThatThrownBy(() -> service.login(new LoginRequest("scout@scouthub.ma", "mauvais-mdp")))
                .isInstanceOf(AuthException.class).hasMessage("E-mail ou mot de passe incorrect.");
        assertThatThrownBy(() -> service.login(new LoginRequest("inconnu@scouthub.ma", "motdepasse1")))
                .isInstanceOf(AuthException.class).hasMessage("E-mail ou mot de passe incorrect.");
    }

    @Test
    void disabledAccountCannotLogIn() {
        existing("scout@scouthub.ma", "motdepasse1", Role.SCOUT).setEnabled(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("scout@scouthub.ma", "motdepasse1")))
                .isInstanceOf(AuthException.class).hasMessageContaining("désactivé");
    }

    @Test
    void changePasswordChecksTheCurrentOne() {
        User u = existing("scout@scouthub.ma", "motdepasse1", Role.SCOUT);

        assertThatThrownBy(() -> service.changePassword("scout@scouthub.ma", new ChangePasswordRequest("faux", "nouveau-mdp")))
                .isInstanceOf(AuthException.class);
        service.changePassword("scout@scouthub.ma", new ChangePasswordRequest("motdepasse1", "nouveau-mdp"));
        assertThat(encoder.matches("nouveau-mdp", u.getPasswordHash())).isTrue();
    }

    @Test
    void listWithoutSearchSendsAnEmptyStringNeverNull() {
        // PostgreSQL types a null bind parameter as bytea and lower(bytea) fails (seen on the real database)
        when(users.search("", null)).thenReturn(java.util.List.of());

        service.listUsers(null, null);
        service.listUsers("   ", null);

        verify(users, times(2)).search("", null);
    }

    @Test
    void adminChangesAnotherUsersRole() {
        User scout = existing("scout@scouthub.ma", "motdepasse1", Role.SCOUT);
        when(users.findById(scout.getId())).thenReturn(Optional.of(scout));

        var updated = service.updateUser(scout.getId(), new UpdateUserRequest(Role.RECRUITER, null), "admin@scouthub.ma");

        assertThat(updated.role()).isEqualTo(Role.RECRUITER);
    }

    @Test
    void adminCannotDemoteOrDisableThemselves() {
        User admin = existing("admin@scouthub.ma", "motdepasse1", Role.ADMIN);
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.updateUser(admin.getId(), new UpdateUserRequest(Role.SCOUT, null), "admin@scouthub.ma"))
                .isInstanceOf(AuthException.class);
        assertThatThrownBy(() -> service.updateUser(admin.getId(), new UpdateUserRequest(null, false), "ADMIN@scouthub.ma"))
                .isInstanceOf(AuthException.class);
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.isEnabled()).isTrue();
    }
}
