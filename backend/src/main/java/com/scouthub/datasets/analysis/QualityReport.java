package com.scouthub.datasets.analysis;

import java.util.List;

/**
 * Data quality score of a dataset (0–100) and its four components (0–1).
 *
 * @param completeness share of cells that are not missing
 * @param uniqueness   share of rows that are not duplicates
 * @param validity     share of typed values (numbers, dates, booleans) that match their column type
 * @param consistency  share of rows with the same number of cells as the header
 * @param issues       human-readable problems, most important first
 */
public record QualityReport(
        double score,
        String grade,
        double completeness,
        double uniqueness,
        double validity,
        double consistency,
        List<String> issues
) {
}
