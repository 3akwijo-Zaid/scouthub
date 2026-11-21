package com.scouthub.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first administrator from {@code ADMIN_EMAIL} / {@code ADMIN_PASSWORD} when no ADMIN
 * exists yet, so a fresh database is usable without putting credentials in a migration.
 * Does nothing once an administrator exists or when the variables are not set.
 */
@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder encoder,
                          @Value("${scouthub.admin.email:}") String email,
                          @Value("${scouthub.admin.password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.existsByRole(Role.ADMIN)) {
            return;
        }
        if (email.isBlank() || password.isBlank()) {
            log.info("Aucun administrateur : définissez ADMIN_EMAIL et ADMIN_PASSWORD pour en créer un au démarrage.");
            return;
        }
        if (password.length() < 8) {
            log.warn("ADMIN_PASSWORD fait moins de 8 caractères : administrateur non créé.");
            return;
        }
        String normalised = AuthService.normalise(email);
        users.findByEmail(normalised).ifPresentOrElse(
                existing -> existing.setRole(Role.ADMIN),
                () -> users.save(new User(normalised, encoder.encode(password), "Administrateur", Role.ADMIN)));
        log.info("Administrateur initial prêt : {}", normalised);
    }
}
