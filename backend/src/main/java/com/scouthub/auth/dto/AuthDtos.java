package com.scouthub.auth.dto;

import com.scouthub.auth.Role;
import com.scouthub.auth.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Request and response bodies of the auth and user-admin endpoints. */
public final class AuthDtos {

    private AuthDtos() {
    }

    // bcrypt only reads the first 72 bytes of a password: cap it so nothing is silently ignored
    private static final int PASSWORD_MIN = 8;
    private static final int PASSWORD_MAX = 72;

    public record RegisterRequest(
            @NotBlank(message = "L'e-mail est obligatoire.")
            @Email(message = "L'e-mail n'est pas valide.")
            @Size(max = 255, message = "L'e-mail est trop long.")
            String email,
            @NotBlank(message = "Le mot de passe est obligatoire.")
            @Size(min = PASSWORD_MIN, max = PASSWORD_MAX, message = "Le mot de passe doit faire entre 8 et 72 caractères.")
            String password,
            @Size(max = 150, message = "Le nom est trop long.")
            String fullName) {
    }

    public record LoginRequest(
            @NotBlank(message = "L'e-mail est obligatoire.") String email,
            @NotBlank(message = "Le mot de passe est obligatoire.") String password) {
    }

    public record UpdateProfileRequest(
            @Size(max = 150, message = "Le nom est trop long.") String fullName) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Le mot de passe actuel est obligatoire.") String currentPassword,
            @NotBlank(message = "Le nouveau mot de passe est obligatoire.")
            @Size(min = PASSWORD_MIN, max = PASSWORD_MAX, message = "Le mot de passe doit faire entre 8 et 72 caractères.")
            String newPassword) {
    }

    /** Admin update: every field is optional, only the ones sent are changed. */
    public record UpdateUserRequest(Role role, Boolean enabled) {
    }

    public record UserResponse(UUID id, String email, String fullName, Role role, boolean enabled,
                               OffsetDateTime createdAt, OffsetDateTime lastLoginAt) {
        public static UserResponse of(User u) {
            return new UserResponse(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.isEnabled(),
                    u.getCreatedAt(), u.getLastLoginAt());
        }
    }

    public record AuthResponse(String token, Instant expiresAt, UserResponse user) {
    }
}
