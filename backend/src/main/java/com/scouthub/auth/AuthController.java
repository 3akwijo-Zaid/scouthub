package com.scouthub.auth;

import com.scouthub.auth.dto.AuthDtos.AuthResponse;
import com.scouthub.auth.dto.AuthDtos.ChangePasswordRequest;
import com.scouthub.auth.dto.AuthDtos.LoginRequest;
import com.scouthub.auth.dto.AuthDtos.RegisterRequest;
import com.scouthub.auth.dto.AuthDtos.UpdateProfileRequest;
import com.scouthub.auth.dto.AuthDtos.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Registration, login and the logged-in user's own profile (CdC §5.1). */
@RestController
@RequestMapping("/auth")
@Tag(name = "Auth", description = "Inscription, connexion, profil")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/register")
    @SecurityRequirements
    @Operation(summary = "Créer un compte (rôle SCOUT) et recevoir un jeton")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.register(request));
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(summary = "Se connecter et recevoir un jeton JWT")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request);
    }

    @GetMapping("/me")
    @Operation(summary = "Profil de l'utilisateur connecté")
    public UserResponse me(Authentication authentication) {
        return service.me(authentication.getName());
    }

    @PutMapping("/me")
    @Operation(summary = "Modifier son profil")
    public UserResponse updateMe(@Valid @RequestBody UpdateProfileRequest request, Authentication authentication) {
        return service.updateProfile(authentication.getName(), request);
    }

    @PutMapping("/me/password")
    @Operation(summary = "Changer son mot de passe")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                               Authentication authentication) {
        service.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }
}
