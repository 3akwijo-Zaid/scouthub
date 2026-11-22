package com.scouthub.datasets;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scouthub.datasets.analysis.ColumnProfile;
import com.scouthub.datasets.analysis.ColumnType;
import com.scouthub.datasets.analysis.CsvParser;
import com.scouthub.datasets.analysis.DatasetProfile;
import com.scouthub.datasets.analysis.DatasetProfiler;
import com.scouthub.datasets.analysis.ParsedCsv;
import com.scouthub.datasets.analysis.QualityReport;
import com.scouthub.datasets.analysis.QualityScorer;
import com.scouthub.datasets.analysis.VizRecommendation;
import com.scouthub.datasets.analysis.VizRecommender;
import com.scouthub.datasets.dto.ColumnInfo;
import com.scouthub.datasets.dto.DatasetDetail;
import com.scouthub.datasets.dto.DatasetMetadata;
import com.scouthub.datasets.dto.DatasetSummary;
import com.scouthub.datasets.dto.RowsPage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.StringReader;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Imports CSV files as datasets: parse → profile → quality score → chart recommendations → store.
 */
@Service
public class DatasetService {

    static final int MAX_PAGE_SIZE = 200;
    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");

    private final DatasetRepository repository;
    private final ObjectMapper mapper;
    private final int maxRows;
    private final int maxColumns;
    private final DatasetProfiler profiler = new DatasetProfiler();
    private final QualityScorer scorer = new QualityScorer();
    private final VizRecommender recommender = new VizRecommender();

    public DatasetService(DatasetRepository repository, ObjectMapper mapper,
                          @Value("${datasets.max-rows:200000}") int maxRows,
                          @Value("${datasets.max-columns:200}") int maxColumns) {
        this.repository = repository;
        this.mapper = mapper;
        this.maxRows = maxRows;
        this.maxColumns = maxColumns;
    }

    // ------------------------------------------------------------------ import

    @Transactional
    public DatasetSummary importCsv(MultipartFile file, DatasetMetadata metadata, String ownerEmail) {
        validate(file, metadata);

        ParsedCsv csv;
        try {
            csv = new CsvParser(maxRows, maxColumns).parse(new StringReader(decode(file.getBytes())));
        } catch (CsvParser.CsvFormatException e) {
            throw new DatasetImportException(e.getMessage(), e);
        } catch (IOException e) {
            throw new DatasetImportException("Impossible de lire le fichier envoyé.", e);
        }
        if (csv.rowCount() == 0) {
            throw new DatasetImportException("Le fichier ne contient que l'en-tête, aucune ligne de données.");
        }

        DatasetProfile profile = profiler.profile(csv);
        QualityReport quality = scorer.score(profile);
        List<VizRecommendation> recommendations = recommender.recommend(profile);
        UUID ownerId = ownerEmail == null ? null : repository.findUserIdByEmail(ownerEmail).orElse(null);

        long id = repository.insertDataset(new DatasetRepository.NewDataset(
                metadata.title().trim(),
                blankToNull(metadata.description()),
                blankToNull(metadata.category()),
                blankToNull(metadata.source()),
                file.getOriginalFilename(),
                ownerId,
                ownerEmail,
                csv.rowCount(),
                csv.columnCount(),
                profile.duplicateRows(),
                String.valueOf(csv.delimiter()),
                quality.score(),
                quality.grade(),
                toJson(quality),
                toJson(recommendations),
                toJson(profile.correlations())));

        repository.insertColumns(id, profile.columns().stream()
                .map(c -> new DatasetRepository.NewColumn(c.position(), c.name(), c.type().name(), toJson(c)))
                .toList());
        repository.insertRows(id, typedRows(csv, profile));

        return repository.findSummary(id).orElseThrow(() -> new DatasetNotFoundException(id));
    }

    private static void validate(MultipartFile file, DatasetMetadata metadata) {
        if (file == null || file.isEmpty()) {
            throw new DatasetImportException("Aucun fichier reçu.");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
            throw new DatasetImportException("Seuls les fichiers .csv sont acceptés.");
        }
        if (metadata.title() == null || metadata.title().isBlank()) {
            throw new DatasetImportException("Le titre du dataset est obligatoire.");
        }
        if (metadata.title().trim().length() > 200) {
            throw new DatasetImportException("Le titre ne doit pas dépasser 200 caractères.");
        }
        if (metadata.category() != null && metadata.category().trim().length() > 80) {
            throw new DatasetImportException("La catégorie ne doit pas dépasser 80 caractères.");
        }
        if (metadata.source() != null && metadata.source().trim().length() > 300) {
            throw new DatasetImportException("La source ne doit pas dépasser 300 caractères.");
        }
    }

    /** Decodes as UTF-8, or as Windows-1252 when the file is not valid UTF-8 (French Excel exports). */
    static String decode(byte[] bytes) {
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
        } catch (CharacterCodingException e) {
            return new String(bytes, WINDOWS_1252);
        }
    }

    /** Builds one JSON object per row, with numbers, booleans and ISO dates typed by column. */
    private List<String> typedRows(ParsedCsv csv, DatasetProfile profile) {
        List<ColumnProfile> columns = profile.columns();
        List<String> rows = new ArrayList<>(csv.rowCount());
        for (List<String> row : csv.rows()) {
            Map<String, Object> object = new LinkedHashMap<>();
            for (ColumnProfile c : columns) {
                object.put(c.name(), typedValue(row.get(c.position()), c.type()));
            }
            rows.add(toJson(object));
        }
        return rows;
    }

    static Object typedValue(String raw, ColumnType type) {
        if (DatasetProfiler.isMissing(raw)) {
            return null;
        }
        String value = raw.trim();
        switch (type) {
            case INTEGER, DECIMAL -> {
                Double number = DatasetProfiler.parseNumber(value);
                if (number == null) {
                    return value;
                }
                if (type == ColumnType.INTEGER && number == Math.rint(number) && Math.abs(number) < 9e15) {
                    return number.longValue();
                }
                return number;
            }
            case BOOLEAN -> {
                Boolean bool = DatasetProfiler.parseBoolean(value);
                return bool == null ? value : bool;
            }
            case DATE -> {
                LocalDate date = DatasetProfiler.parseDate(value);
                return date == null ? value : date.toString();
            }
            default -> {
                return value;
            }
        }
    }

    // ------------------------------------------------------------------ reads

    @Transactional(readOnly = true)
    public List<DatasetSummary> list(String query, String category) {
        return repository.findAll(query, category);
    }

    @Transactional(readOnly = true)
    public DatasetDetail get(long id) {
        return repository.findDetail(id).orElseThrow(() -> new DatasetNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public RowsPage rows(long id, int page, int size, String search, String filterColumn, String filterValue,
                         String sort, boolean descending) {
        List<ColumnInfo> columns = repository.findColumns(id);
        if (columns.isEmpty() && repository.findSummary(id).isEmpty()) {
            throw new DatasetNotFoundException(id);
        }
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        String filter = blankToNull(filterColumn);
        if (filter != null) {
            requireColumn(columns, filter);
        }
        String sortColumn = blankToNull(sort);
        boolean numeric = false;
        if (sortColumn != null) {
            ColumnInfo column = requireColumn(columns, sortColumn);
            numeric = ColumnType.valueOf(column.type()).isNumeric();
        }
        return repository.findRows(id, safePage, safeSize, search, filter, filterValue, sortColumn, numeric, descending);
    }

    // ------------------------------------------------------------------ delete

    /** Deletes a dataset; only its owner or an administrator may do it. */
    @Transactional
    public void delete(long id, String userEmail, boolean isAdmin) {
        String owner = repository.findOwnerEmail(id).orElseThrow(() -> new DatasetNotFoundException(id));
        if (!isAdmin && (userEmail == null || !userEmail.equalsIgnoreCase(owner))) {
            throw new DatasetAccessDeniedException("Seul le propriétaire du dataset ou un administrateur peut le supprimer.");
        }
        repository.delete(id);
    }

    // ------------------------------------------------------------------ helpers

    private static ColumnInfo requireColumn(List<ColumnInfo> columns, String name) {
        return columns.stream().filter(c -> c.name().equals(name)).findFirst()
                .orElseThrow(() -> new DatasetImportException("Colonne inconnue : " + name));
    }

    private String toJson(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize " + value.getClass().getSimpleName(), e);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
