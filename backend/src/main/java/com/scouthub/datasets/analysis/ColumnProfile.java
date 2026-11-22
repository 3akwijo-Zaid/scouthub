package com.scouthub.datasets.analysis;

import java.util.List;

/**
 * Statistics computed for one column.
 * Numeric fields are {@code null} for non-numeric columns; date bounds are {@code null} for non-date columns.
 *
 * @param invalid  non-missing values that do not match the inferred type (e.g. "abc" in a numeric column)
 * @param outliers numeric values outside [Q1 − 1.5·IQR, Q3 + 1.5·IQR]
 * @param geoRole  LATITUDE or LONGITUDE when the column looks like coordinates, otherwise {@code null}
 */
public record ColumnProfile(
        int position,
        String name,
        ColumnType type,
        int count,
        int missing,
        int distinct,
        int invalid,
        Double min,
        Double max,
        Double mean,
        Double median,
        Double stdDev,
        Double q1,
        Double q3,
        Integer outliers,
        String minDate,
        String maxDate,
        List<ValueCount> topValues,
        GeoRole geoRole
) {

    public enum GeoRole { LATITUDE, LONGITUDE }

    /** A value and how many times it appears. */
    public record ValueCount(String value, int count) {
    }

    public double missingRatio() {
        int total = count + missing;
        return total == 0 ? 0 : (double) missing / total;
    }
}
