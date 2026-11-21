package com.scouthub.datasets.analysis;

import java.util.List;

/**
 * Profile of a whole dataset: one {@link ColumnProfile} per column plus table-level counts.
 *
 * @param duplicateRows rows that are exact copies of an earlier row
 * @param raggedRows    rows whose cell count differed from the header in the original file
 * @param correlations  strongest Pearson correlations between numeric columns, strongest first
 */
public record DatasetProfile(
        int rowCount,
        int duplicateRows,
        int raggedRows,
        List<ColumnProfile> columns,
        List<Correlation> correlations
) {

    /** Pearson correlation between two numeric columns, computed on rows where both are present. */
    public record Correlation(String columnA, String columnB, double coefficient, int pairs) {
    }
}
