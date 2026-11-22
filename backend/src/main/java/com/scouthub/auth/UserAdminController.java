package com.scouthub.auth;

import com.scouthub.auth.dto.AuthDtos.UpdateUserRequest;
import com.scouthub.auth.dto.AuthDtos.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** User and role management, administrators only (CdC §5.1). */
@RestController
@RequestMapping("/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Utilisateurs", description = "Gestion des comptes et des rôles (administrateur)")
public class UserAdminController {

    private final AuthService service;

    public UserAdminController(AuthService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lister les utilisateurs (recherche e-mail / nom, filtre par rôle)")
    public List<UserResponse> list(@RequestParam(value = "q", required = false) String query,
                                   @RequestParam(value = "role", required = false) Role role) {
        return service.listUsers(query, role);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Changer le rôle d'un utilisateur ou activer / désactiver son compte")
    public UserResponse update(@PathVariable("id") UUID id, @RequestBody UpdateUserRequest request,
                               Authentication authentication) {
        return service.updateUser(id, request, authentication.getName());
    }
}
