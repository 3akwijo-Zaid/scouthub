package com.scouthub.auth;

import com.scouthub.auth.dto.AuthDtos.AuthResponse;
import com.scouthub.auth.dto.AuthDtos.UserResponse;
import com.scouthub.common.ApiExceptionHandler;
import com.scouthub.datasets.DatasetController;
import com.scouthub.datasets.DatasetService;
import com.scouthub.datasets.dto.DatasetSummary;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The real security chain (JWT filter, URL rules, @PreAuthorize) in front of the controllers. */
@WebMvcTest(controllers = {AuthController.class, UserAdminController.class, DatasetController.class})
@Import({SecurityConfig.class, JwtService.class, ApiExceptionHandler.class})
class SecurityWebTest {

    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;

    @MockitoBean private UserRepository users;
    @MockitoBean private AuthService authService;
    @MockitoBean private DatasetService datasetService;

    /** Stores a user with {@code role} in the mocked repository and returns a valid bearer header for them. */
    private String bearer(String email, Role role) {
        User u = new User(email, "hash", null, role);
        u.setId(UUID.randomUUID());
        when(users.findByEmail(email)).thenReturn(Optional.of(u));
        return "Bearer " + jwt.issue(u).token();
    }

    private static UserResponse userResponse(String email, Role role) {
        return new UserResponse(UUID.randomUUID(), email, null, role, true, null, null);
    }

    // ── public routes ─────────────────────────────────────────────────

    @Test
    void loginIsPublic() throws Exception {
        when(authService.login(any())).thenReturn(
                new AuthResponse("jwt", Instant.now(), userResponse("scout@scouthub.ma", Role.SCOUT)));

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"scout@scouthub.ma\",\"password\":\"motdepasse1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt"))
                .andExpect(jsonPath("$.user.role").value("SCOUT"));
    }

    @Test
    void registerReportsEachInvalidField() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"pas-un-email\",\"password\":\"court\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.errors.email").value("L'e-mail n'est pas valide."))
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void registerReturns201() throws Exception {
        when(authService.register(any())).thenReturn(
                new AuthResponse("jwt", Instant.now(), userResponse("new@scouthub.ma", Role.SCOUT)));

        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new@scouthub.ma\",\"password\":\"motdepasse1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("new@scouthub.ma"));
    }

    // ── authentication ────────────────────────────────────────────────

    @Test
    void protectedRouteWithoutTokenIs401Problem() throws Exception {
        mvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.detail").value("Connectez-vous pour accéder à cette ressource."));
    }

    @Test
    void garbageTokenIs401WithAReason() throws Exception {
        mvc.perform(get("/auth/me").header("Authorization", "Bearer not.a.jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Jeton invalide ou expiré, reconnectez-vous."));
    }

    @Test
    void validTokenReachesTheProfile() throws Exception {
        String auth = bearer("scout@scouthub.ma", Role.SCOUT);
        when(authService.me("scout@scouthub.ma")).thenReturn(userResponse("scout@scouthub.ma", Role.SCOUT));

        mvc.perform(get("/auth/me").header("Authorization", auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("scout@scouthub.ma"));
    }

    @Test
    void disabledAccountsTokenStopsWorkingImmediately() throws Exception {
        String auth = bearer("scout@scouthub.ma", Role.SCOUT);
        users.findByEmail("scout@scouthub.ma").orElseThrow().setEnabled(false);

        mvc.perform(get("/auth/me").header("Authorization", auth))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Ce compte est désactivé."));
    }

    // ── roles ─────────────────────────────────────────────────────────

    @Test
    void userAdminIsForbiddenToAScout() throws Exception {
        mvc.perform(get("/users").header("Authorization", bearer("scout@scouthub.ma", Role.SCOUT)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Accès refusé"));
    }

    @Test
    void userAdminIsOpenToAnAdmin() throws Exception {
        when(authService.listUsers(null, null)).thenReturn(List.of(userResponse("scout@scouthub.ma", Role.SCOUT)));

        mvc.perform(get("/users").header("Authorization", bearer("admin@scouthub.ma", Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("scout@scouthub.ma"));
    }

    @Test
    void roleComesFromTheDatabaseNotFromTheToken() throws Exception {
        String adminToken = bearer("ex-admin@scouthub.ma", Role.ADMIN);
        users.findByEmail("ex-admin@scouthub.ma").orElseThrow().setRole(Role.SCOUT); // demoted after login

        mvc.perform(get("/users").header("Authorization", adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void unknownRoleFilterIs400() throws Exception {
        mvc.perform(get("/users").param("role", "COACH").header("Authorization", bearer("admin@scouthub.ma", Role.ADMIN)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Valeur invalide pour le paramètre « role »."));
    }

    // ── Aymen's dataset rules now enforced (@PreAuthorize) ────────────

    @Test
    void anyLoggedInUserCanListDatasets() throws Exception {
        when(datasetService.list(null, null)).thenReturn(List.of());

        mvc.perform(get("/datasets").header("Authorization", bearer("scout@scouthub.ma", Role.SCOUT)))
                .andExpect(status().isOk());
    }

    @Test
    void scoutCannotImportADataset() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "a.csv", "text/csv", "a,b\n1,2\n".getBytes());

        mvc.perform(multipart("/datasets").file(file).param("title", "Test")
                        .header("Authorization", bearer("scout@scouthub.ma", Role.SCOUT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void analystImportsWithTheirEmailAsOwner() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "a.csv", "text/csv", "a,b\n1,2\n".getBytes());
        when(datasetService.importCsv(any(), any(), eq("analyst@scouthub.ma"))).thenReturn(
                new DatasetSummary(7L, "Test", null, null, null, "a.csv", "analyst@scouthub.ma",
                        OffsetDateTime.parse("2026-11-21T18:00:00Z"), 1, 2, 100.0, "A"));

        mvc.perform(multipart("/datasets").file(file).param("title", "Test")
                        .header("Authorization", bearer("analyst@scouthub.ma", Role.ANALYST)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerEmail").value("analyst@scouthub.ma"));
    }
}
