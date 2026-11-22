package com.scouthub.datasets.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/**
 * Everything the dataset page needs: metadata, column profiles, quality report,
 * recommended charts and correlations.
 */
public record DatasetDetail(
        DatasetSummary dataset,
        int duplicateRows,
        List<ColumnInfo> columns,
        JsonNode quality,
        JsonNode recommendations,
        JsonNode correlations
) {
}
