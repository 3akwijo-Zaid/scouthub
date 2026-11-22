package com.scouthub.datasets.dto;

import java.time.OffsetDateTime;

/** One dataset in the list (without columns and rows). */
public record DatasetSummary(
        Long id,
        String title,
        String description,
        String category,
        String source,
        String fileName,
        String ownerEmail,
        OffsetDateTime importedAt,
        int rowCount,
        int columnCount,
        double qualityScore,
        String qualityGrade
) {
}
