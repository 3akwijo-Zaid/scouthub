package com.scouthub.auth;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Authenticates {@code Authorization: Bearer <jwt>} requests.
 * <p>
 * The principal name is the user's email and the authority is {@code ROLE_<role>} read from the
 * database, so {@code @PreAuthorize("hasRole('ANALYST')")} and {@code authentication.getName()}
 * work in every controller. A missing or invalid token leaves the request anonymous: public
 * routes still answer, protected ones get a 401 from {@link ProblemAuthenticationHandlers}.
 * <p>
 * Deliberately not a {@code @Component}: it is created in {@link SecurityConfig} so that it is
 * registered once, inside the security chain, and not picked up by {@code @WebMvcTest} slices.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** Request attribute read by the entry point to explain why a request is unauthenticated. */
    static final String AUTH_ERROR = JwtAuthenticationFilter.class.getName() + ".error";

    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.regionMatches(true, 0, BEARER, 0, BEARER.length())
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticate(header.substring(BEARER.length()).trim(), request);
        }
        chain.doFilter(request, response);
    }

    private void authenticate(String token, HttpServletRequest request) {
        String email;
        try {
            email = jwtService.verify(token);
        } catch (JwtException | IllegalArgumentException e) {
            request.setAttribute(AUTH_ERROR, "Jeton invalide ou expiré, reconnectez-vous.");
            return;
        }
        Optional<User> user = users.findByEmail(email);
        if (user.isEmpty()) {
            request.setAttribute(AUTH_ERROR, "Ce compte n'existe plus.");
            return;
        }
        if (!user.get().isEnabled()) {
            request.setAttribute(AUTH_ERROR, "Ce compte est désactivé.");
            return;
        }
        var authentication = new UsernamePasswordAuthenticationToken(
                user.get().getEmail(), null, List.of(new SimpleGrantedAuthority(user.get().getRole().authority())));
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
