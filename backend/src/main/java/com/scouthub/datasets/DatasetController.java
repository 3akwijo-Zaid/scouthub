package com.scouthub.datasets;

import com.scouthub.datasets.dto.DatasetDetail;
import com.scouthub.datasets.dto.DatasetMetadata;
import com.scouthub.datasets.dto.DatasetSummary;
import com.scouthub.datasets.dto.RowsPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Dataset management (CdC §5.3) and exploration (CdC §5.4).
 * <p>
 * Role checks use {@code @PreAuthorize} (method security is enabled in the auth package's SecurityConfig).
 * The web app mirrors these rules in features/datasets/permissions.ts.
 */
@RestController
@RequestMapping("/datasets")
@Tag(name = "Datasets", description = "Import CSV, profil des colonnes, score de qualité, exploration")
public class DatasetController {

    private final DatasetService service;

    public DatasetController(DatasetService service) {
        this.service = service;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ANALYST', 'ADMIN')")
    @Operation(summary = "Importer un fichier CSV comme dataset")
    public ResponseEntity<DatasetSummary> importCsv(
            @RequestPart("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "source", required = false) String source,
            Authentication authentication) {
        DatasetSummary created = service.importCsv(file,
                new DatasetMetadata(title, description, category, source),
                authentication == null ? null : authentication.getName());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping
    @Operation(summary = "Lister les datasets (recherche dans le titre et la description, filtre par catégorie)")
    public List<DatasetSummary> list(@RequestParam(value = "q", required = false) String query,
                                     @RequestParam(value = "category", required = false) String category) {
        return service.list(query, category);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Détail d'un dataset : colonnes, statistiques, qualité, visualisations recommandées")
    public DatasetDetail get(@PathVariable("id") long id) {
        return service.get(id);
    }

    @GetMapping("/{id}/rows")
    @Operation(summary = "Lignes d'un dataset, paginées, avec recherche, filtre et tri")
    public RowsPage rows(@PathVariable("id") long id,
                         @RequestParam(value = "page", defaultValue = "0") int page,
                         @RequestParam(value = "size", defaultValue = "50") int size,
                         @RequestParam(value = "q", required = false) String search,
                         @RequestParam(value = "filterColumn", required = false) String filterColumn,
                         @RequestParam(value = "filterValue", required = false) String filterValue,
                         @RequestParam(value = "sort", required = false) String sort,
                         @RequestParam(value = "dir", defaultValue = "asc") String direction) {
        return service.rows(id, page, size, search, filterColumn, filterValue, sort, "desc".equalsIgnoreCase(direction));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ANALYST', 'ADMIN')")
    @Operation(summary = "Supprimer un dataset (propriétaire ou administrateur)")
    public ResponseEntity<Void> delete(@PathVariable("id") long id, Authentication authentication) {
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        service.delete(id, authentication == null ? null : authentication.getName(), isAdmin);
        return ResponseEntity.noContent().build();
    }
}
