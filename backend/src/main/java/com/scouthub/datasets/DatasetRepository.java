package com.scouthub.datasets;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scouthub.datasets.dto.ColumnInfo;
import com.scouthub.datasets.dto.DatasetDetail;
import com.scouthub.datasets.dto.DatasetSummary;
import com.scouthub.datasets.dto.RowsPage;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data access for datasets, written with JdbcTemplate: rows are stored as JSONB,
 * which is simpler to query directly in SQL than through JPA entities.
 */
@Repository
public class DatasetRepository {

    static final int BATCH_SIZE = 1000;

    private static final String SUMMARY_COLUMNS = """
            id, title, description, category, source, file_name, owner_email, imported_at,
            row_count, column_count, quality_score, quality_grade""";

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public DatasetRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    // ------------------------------------------------------------------ writes

    /** Values written for a new dataset; JSON fields are already serialized. */
    public record NewDataset(
            String title, String description, String category, String source, String fileName,
            UUID ownerId, String ownerEmail, int rowCount, int columnCount, int duplicateRows, String delimiter,
            double qualityScore, String qualityGrade, String qualityJson, String recommendationsJson,
            String correlationsJson) {
    }

    /** A column to insert; {@code profileJson} is the serialized ColumnProfile. */
    public record NewColumn(int position, String name, String type, String profileJson) {
    }

    public long insertDataset(NewDataset d) {
        Long id = jdbc.queryForObject("""
                        INSERT INTO datasets (title, description, category, source, file_name, owner_id, owner_email,
                                              row_count, column_count, duplicate_rows, delimiter, quality_score, quality_grade,
                                              quality, recommendations, correlations)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb)
                        RETURNING id""",
                Long.class,
                d.title(), d.description(), d.category(), d.source(), d.fileName(), d.ownerId(), d.ownerEmail(),
                d.rowCount(), d.columnCount(), d.duplicateRows(), d.delimiter(), d.qualityScore(), d.qualityGrade(),
                d.qualityJson(), d.recommendationsJson(), d.correlationsJson());
        if (id == null) {
            throw new IllegalStateException("INSERT INTO datasets returned no id");
        }
        return id;
    }

    public void insertColumns(long datasetId, List<NewColumn> columns) {
        List<Object[]> args = columns.stream()
                .map(c -> new Object[]{datasetId, c.position(), c.name(), c.type(), c.profileJson()})
                .toList();
        jdbc.batchUpdate("""
                INSERT INTO dataset_columns (dataset_id, position, name, type, profile)
                VALUES (?, ?, ?, ?, ?::jsonb)""", args);
    }

    /** Inserts rows in batches of {@value #BATCH_SIZE}; {@code rowsJson.get(i)} gets row_index i. */
    public void insertRows(long datasetId, List<String> rowsJson) {
        String sql = "INSERT INTO dataset_rows (dataset_id, row_index, data) VALUES (?, ?, ?::jsonb)";
        List<Object[]> batch = new ArrayList<>(BATCH_SIZE);
        for (int i = 0; i < rowsJson.size(); i++) {
            batch.add(new Object[]{datasetId, i, rowsJson.get(i)});
            if (batch.size() == BATCH_SIZE) {
                jdbc.batchUpdate(sql, batch);
                batch.clear();
            }
        }
        if (!batch.isEmpty()) {
            jdbc.batchUpdate(sql, batch);
        }
    }

    public boolean delete(long id) {
        return jdbc.update("DELETE FROM datasets WHERE id = ?", id) > 0;
    }

    // ------------------------------------------------------------------ reads

    public Optional<UUID> findUserIdByEmail(String email) {
        return jdbc.queryForList("SELECT id FROM users WHERE email = ?", UUID.class, email).stream().findFirst();
    }

    public List<DatasetSummary> findAll(String query, String category) {
        StringBuilder sql = new StringBuilder("SELECT " + SUMMARY_COLUMNS + " FROM datasets WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (query != null && !query.isBlank()) {
            sql.append(" AND (title ILIKE ? OR description ILIKE ?)");
            String like = "%" + escapeLike(query.trim()) + "%";
            params.add(like);
            params.add(like);
        }
        if (category != null && !category.isBlank()) {
            sql.append(" AND category = ?");
            params.add(category.trim());
        }
        sql.append(" ORDER BY imported_at DESC");
        return jdbc.query(sql.toString(), SUMMARY_MAPPER, params.toArray());
    }

    public Optional<DatasetSummary> findSummary(long id) {
        return jdbc.query("SELECT " + SUMMARY_COLUMNS + " FROM datasets WHERE id = ?", SUMMARY_MAPPER, id)
                .stream().findFirst();
    }

    public Optional<String> findOwnerEmail(long id) {
        return jdbc.queryForList("SELECT owner_email FROM datasets WHERE id = ?", String.class, id)
                .stream().findFirst();
    }

    public Optional<DatasetDetail> findDetail(long id) {
        Optional<DatasetSummary> summary = findSummary(id);
        if (summary.isEmpty()) {
            return Optional.empty();
        }
        List<ColumnInfo> columns = findColumns(id);
        return jdbc.query("SELECT duplicate_rows, quality, recommendations, correlations FROM datasets WHERE id = ?",
                (rs, i) -> new DatasetDetail(
                        summary.get(),
                        rs.getInt("duplicate_rows"),
                        columns,
                        json(rs.getString("quality")),
                        json(rs.getString("recommendations")),
                        json(rs.getString("correlations"))),
                id).stream().findFirst();
    }

    public List<ColumnInfo> findColumns(long datasetId) {
        return jdbc.query("SELECT position, name, type, profile FROM dataset_columns WHERE dataset_id = ? ORDER BY position",
                (rs, i) -> new ColumnInfo(rs.getInt("position"), rs.getString("name"), rs.getString("type"),
                        json(rs.getString("profile"))),
                datasetId);
    }

    /**
     * One page of rows.
     *
     * @param search       text searched anywhere in the row (case-insensitive), or null
     * @param filterColumn column to filter on, or null; must be an existing column (checked by the service)
     * @param filterValue  value the column must contain (case-insensitive)
     * @param sortColumn   column to sort on, or null for file order; must be an existing column
     * @param numericSort  true to sort numerically (numeric columns), false to sort as text
     */
    public RowsPage findRows(long datasetId, int page, int size, String search,
                             String filterColumn, String filterValue,
                             String sortColumn, boolean numericSort, boolean descending) {
        StringBuilder where = new StringBuilder(" WHERE dataset_id = ?");
        List<Object> params = new ArrayList<>();
        params.add(datasetId);
        if (search != null && !search.isBlank()) {
            // Search in the values only (searching data::text would also match the column names)
            where.append(" AND EXISTS (SELECT 1 FROM jsonb_each_text(data) cell WHERE cell.value ILIKE ?)");
            params.add("%" + escapeLike(search.trim()) + "%");
        }
        if (filterColumn != null && filterValue != null && !filterValue.isBlank()) {
            where.append(" AND data ->> (?::text) ILIKE ?");
            params.add(filterColumn);
            params.add("%" + escapeLike(filterValue.trim()) + "%");
        }

        Long total = jdbc.queryForObject("SELECT count(*) FROM dataset_rows" + where, Long.class, params.toArray());

        StringBuilder sql = new StringBuilder("SELECT data FROM dataset_rows").append(where);
        List<Object> pageParams = new ArrayList<>(params);
        String direction = descending ? "DESC" : "ASC";
        if (sortColumn == null) {
            sql.append(" ORDER BY row_index ").append(direction);
        } else if (numericSort) {
            // Values that are not JSON numbers (invalid cells) sort last instead of breaking the cast
            sql.append(" ORDER BY CASE WHEN jsonb_typeof(data -> (?::text)) = 'number' THEN (data ->> (?::text))::numeric END ")
                    .append(direction).append(" NULLS LAST, row_index");
            pageParams.add(sortColumn);
            pageParams.add(sortColumn);
        } else {
            sql.append(" ORDER BY data ->> (?::text) ").append(direction).append(" NULLS LAST, row_index");
            pageParams.add(sortColumn);
        }
        sql.append(" LIMIT ? OFFSET ?");
        pageParams.add(size);
        pageParams.add((long) page * size);

        List<JsonNode> content = jdbc.query(sql.toString(), (rs, i) -> json(rs.getString("data")), pageParams.toArray());
        return new RowsPage(content, total == null ? 0 : total, page, size);
    }

    // ------------------------------------------------------------------ helpers

    private static final RowMapper<DatasetSummary> SUMMARY_MAPPER = DatasetRepository::mapSummary;

    private static DatasetSummary mapSummary(ResultSet rs, int rowNum) throws SQLException {
        return new DatasetSummary(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("category"),
                rs.getString("source"),
                rs.getString("file_name"),
                rs.getString("owner_email"),
                rs.getObject("imported_at", OffsetDateTime.class),
                rs.getInt("row_count"),
                rs.getInt("column_count"),
                rs.getDouble("quality_score"),
                rs.getString("quality_grade"));
    }

    private JsonNode json(String value) {
        try {
            return mapper.readTree(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Invalid JSON stored in the database", e);
        }
    }

    /** Escapes LIKE wildcards so a user typing "%" or "_" searches for those characters. */
    static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
