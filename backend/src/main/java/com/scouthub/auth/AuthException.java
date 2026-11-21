package com.scouthub.auth;

import org.springframework.http.HttpStatus;

/** Business error of the auth feature; turned into an RFC 7807 problem by {@code ApiExceptionHandler}. */
public class AuthException extends RuntimeException {

    private final HttpStatus status;
    private final String title;

    private AuthException(HttpStatus status, String title, String detail) {
        super(detail);
        this.status = status;
        this.title = title;
    }

    public HttpStatus status() { return status; }
    public String title() { return title; }

    public static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "Identifiants invalides", "E-mail ou mot de passe incorrect.");
    }

    public static AuthException wrongCurrentPassword() {
        return new AuthException(HttpStatus.BAD_REQUEST, "Requête invalide", "Le mot de passe actuel est incorrect.");
    }

    public static AuthException disabled() {
        return new AuthException(HttpStatus.FORBIDDEN, "Compte désactivé",
                "Ce compte est désactivé. Contactez un administrateur.");
    }

    public static AuthException emailTaken() {
        return new AuthException(HttpStatus.CONFLICT, "E-mail déjà utilisé", "Un compte existe déjà avec cette adresse e-mail.");
    }

    public static AuthException userNotFound() {
        return new AuthException(HttpStatus.NOT_FOUND, "Ressource introuvable", "Utilisateur introuvable.");
    }

    public static AuthException cannotChangeSelf() {
        return new AuthException(HttpStatus.CONFLICT, "Action impossible",
                "Vous ne pouvez pas modifier votre propre rôle ni désactiver votre propre compte.");
    }
}
