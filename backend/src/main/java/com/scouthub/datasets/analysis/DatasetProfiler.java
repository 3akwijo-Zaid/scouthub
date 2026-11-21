package com.scouthub.datasets.analysis;

import com.scouthub.datasets.analysis.ColumnProfile.GeoRole;
import com.scouthub.datasets.analysis.ColumnProfile.ValueCount;
import com.scouthub.datasets.analysis.DatasetProfile.Correlation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Infers the type of every column and computes descriptive statistics,
 * duplicate rows and correlations between numeric columns.
 */
public final class DatasetProfiler {

    /** Share of non-missing values that must match a type for the column to get that type. */
    static final double TYPE_THRESHOLD = 0.95;
    static final int TOP_VALUES = 10;
    static final int MAX_CORRELATION_COLUMNS = 20;
    static final int MAX_CORRELATIONS = 10;

    private static final Set<String> MISSING_TOKENS =
            Set.of("", "na", "n/a", "null", "none", "nan", "-", "?");
    private static final Set<String> TRUE_TOKENS = Set.of("true", "yes", "oui", "vrai");
    private static final Set<String> FALSE_TOKENS = Set.of("false", "no", "non", "faux");

    private static final Pattern INTEGER = Pattern.compile("[+-]?\\d+");
    private static final Pattern DECIMAL = Pattern.compile("[+-]?(\\d+([.,]\\d*)?|[.,]\\d+)([eE][+-]?\\d+)?");
    private static final Pattern LATITUDE_NAME = Pattern.compile("(^|[_\\s-])(lat|latitude)($|[_\\s-])");
    private static final Pattern LONGITUDE_NAME = Pattern.compile("(^|[_\\s-])(lon|lng|long|longitude)($|[_\\s-])");

    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("uuuu-MM-dd").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("uuuu/MM/dd").withResolverStyle(ResolverStyle.STRICT));
    private static final List<DateTimeFormatter> DATE_TIME_FORMATS = List.of(
            DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm[:ss]").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm[:ss]").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm[:ss]").withResolverStyle(ResolverStyle.STRICT));

    public DatasetProfile profile(ParsedCsv csv) {
        List<ColumnProfile> columns = new ArrayList<>(csv.columnCount());
        for (int c = 0; c < csv.columnCount(); c++) {
            columns.add(profileColumn(c, csv.header().get(c), csv.rows()));
        }
        return new DatasetProfile(
                csv.rowCount(),
                countDuplicates(csv.rows()),
                csv.raggedRows(),
                List.copyOf(columns),
                correlations(columns, csv.rows()));
    }

    // ------------------------------------------------------------------ value helpers (also used by the service)

    public static boolean isMissing(String value) {
        return value == null || MISSING_TOKENS.contains(value.trim().toLowerCase(Locale.ROOT));
    }

    /** Parses a number, accepting a decimal comma ("1,5"). Returns {@code null} when it is not a number. */
    public static Double parseNumber(String value) {
        if (value == null) {
            return null;
        }
        String v = value.trim();
        if (!DECIMAL.matcher(v).matches()) {
            return null;
        }
        try {
            return Double.parseDouble(v.replace(',', '.'));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Parses a date or date-time in the supported formats. Returns {@code null} when it is not a date. */
    public static LocalDate parseDate(String value) {
        if (value == null) {
            return null;
        }
        String v = value.trim();
        for (DateTimeFormatter f : DATE_FORMATS) {
            try {
                return LocalDate.parse(v, f);
            } catch (DateTimeParseException ignored) {
                // try next format
            }
        }
        for (DateTimeFormatter f : DATE_TIME_FORMATS) {
            try {
                return LocalDateTime.parse(v, f).toLocalDate();
            } catch (DateTimeParseException ignored) {
                // try next format
            }
        }
        return null;
    }

    public static Boolean parseBoolean(String value) {
        if (value == null) {
            return null;
        }
        String v = value.trim().toLowerCase(Locale.ROOT);
        if (TRUE_TOKENS.contains(v)) {
            return Boolean.TRUE;
        }
        if (FALSE_TOKENS.contains(v)) {
            return Boolean.FALSE;
        }
        return null;
    }

    // ------------------------------------------------------------------ column profiling

    private ColumnProfile profileColumn(int index, String name, List<List<String>> rows) {
        List<String> present = new ArrayList<>();
        int missing = 0;
        for (List<String> row : rows) {
            String v = row.get(index);
            if (isMissing(v)) {
                missing++;
            } else {
                present.add(v.trim());
            }
        }
        int count = present.size();
        Map<String, Integer> frequencies = new HashMap<>();
        int integers = 0, decimals = 0, booleans = 0, dates = 0;
        for (String v : present) {
            frequencies.merge(v, 1, Integer::sum);
            if (INTEGER.matcher(v).matches()) {
                integers++;
            }
            if (parseNumber(v) != null) {
                decimals++;
            }
            if (parseBoolean(v) != null) {
                booleans++;
            }
            if (parseDate(v) != null) {
                dates++;
            }
        }
        int distinct = frequencies.size();

        ColumnType type;
        int matching;
        if (count == 0) {
            type = ColumnType.TEXT;
            matching = 0;
        } else if (integers >= TYPE_THRESHOLD * count) {
            type = ColumnType.INTEGER;
            matching = integers;
        } else if (decimals >= TYPE_THRESHOLD * count) {
            type = ColumnType.DECIMAL;
            matching = decimals;
        } else if (booleans >= TYPE_THRESHOLD * count) {
            type = ColumnType.BOOLEAN;
            matching = booleans;
        } else if (dates >= TYPE_THRESHOLD * count) {
            type = ColumnType.DATE;
            matching = dates;
        } else if (distinct <= 50 && distinct <= 0.5 * count) {
            type = ColumnType.CATEGORY;
            matching = count;
        } else {
            type = ColumnType.TEXT;
            matching = count;
        }
        int invalid = count - matching;

        Double min = null, max = null, mean = null, median = null, std = null, q1 = null, q3 = null;
        Integer outliers = null;
        String minDate = null, maxDate = null;
        List<ValueCount> top = null;
        GeoRole geo = null;

        if (type.isNumeric()) {
            double[] values = present.stream().map(DatasetProfiler::parseNumber)
                    .filter(java.util.Objects::nonNull).mapToDouble(Double::doubleValue).sorted().toArray();
            if (values.length > 0) {
                min = values[0];
                max = values[values.length - 1];
                mean = Arrays.stream(values).average().orElse(0);
                median = percentile(values, 0.5);
                q1 = percentile(values, 0.25);
                q3 = percentile(values, 0.75);
                std = standardDeviation(values, mean);
                double iqr = q3 - q1;
                double low = q1 - 1.5 * iqr;
                double high = q3 + 1.5 * iqr;
                int out = 0;
                for (double v : values) {
                    if (v < low || v > high) {
                        out++;
                    }
                }
                outliers = out;
                geo = geoRole(name, min, max);
            }
        } else if (type == ColumnType.DATE) {
            LocalDate first = null, last = null;
            for (String v : present) {
                LocalDate d = parseDate(v);
                if (d == null) {
                    continue;
                }
                if (first == null || d.isBefore(first)) {
                    first = d;
                }
                if (last == null || d.isAfter(last)) {
                    last = d;
                }
            }
            minDate = first == null ? null : first.toString();
            maxDate = last == null ? null : last.toString();
        } else {
            top = frequencies.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed()
                            .thenComparing(Map.Entry.comparingByKey()))
                    .limit(TOP_VALUES)
                    .map(e -> new ValueCount(e.getKey(), e.getValue()))
                    .toList();
        }

        return new ColumnProfile(index, name, type, count, missing, distinct, invalid,
                min, max, mean, median, std, q1, q3, outliers, minDate, maxDate, top, geo);
    }

    private static GeoRole geoRole(String name, double min, double max) {
        String n = name.toLowerCase(Locale.ROOT);
        if (LATITUDE_NAME.matcher(n).find() && min >= -90 && max <= 90) {
            return GeoRole.LATITUDE;
        }
        if (LONGITUDE_NAME.matcher(n).find() && min >= -180 && max <= 180) {
            return GeoRole.LONGITUDE;
        }
        return null;
    }

    /** Linear interpolation between closest ranks, on a sorted array. */
    static double percentile(double[] sorted, double p) {
        if (sorted.length == 1) {
            return sorted[0];
        }
        double rank = p * (sorted.length - 1);
        int lower = (int) Math.floor(rank);
        int upper = (int) Math.ceil(rank);
        return sorted[lower] + (rank - lower) * (sorted[upper] - sorted[lower]);
    }

    /** Sample standard deviation (n − 1); 0 for a single value. */
    static double standardDeviation(double[] values, double mean) {
        if (values.length < 2) {
            return 0;
        }
        double sum = 0;
        for (double v : values) {
            sum += (v - mean) * (v - mean);
        }
        return Math.sqrt(sum / (values.length - 1));
    }

    // ------------------------------------------------------------------ table level

    private static int countDuplicates(List<List<String>> rows) {
        Set<List<String>> seen = new HashSet<>();
        int duplicates = 0;
        for (List<String> row : rows) {
            if (!seen.add(row)) {
                duplicates++;
            }
        }
        return duplicates;
    }

    private static List<Correlation> correlations(List<ColumnProfile> columns, List<List<String>> rows) {
        List<ColumnProfile> numeric = columns.stream()
                .filter(c -> c.type().isNumeric() && c.stdDev() != null && c.stdDev() > 0)
                .limit(MAX_CORRELATION_COLUMNS)
                .toList();
        List<Correlation> result = new ArrayList<>();
        for (int i = 0; i < numeric.size(); i++) {
            for (int j = i + 1; j < numeric.size(); j++) {
                Correlation c = pearson(numeric.get(i), numeric.get(j), rows);
                if (c != null) {
                    result.add(c);
                }
            }
        }
        result.sort(Comparator.comparingDouble((Correlation c) -> Math.abs(c.coefficient())).reversed());
        return List.copyOf(result.subList(0, Math.min(MAX_CORRELATIONS, result.size())));
    }

    private static Correlation pearson(ColumnProfile a, ColumnProfile b, List<List<String>> rows) {
        double sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
        int n = 0;
        for (List<String> row : rows) {
            Double x = parseNumber(row.get(a.position()));
            Double y = parseNumber(row.get(b.position()));
            if (x == null || y == null) {
                continue;
            }
            n++;
            sumX += x;
            sumY += y;
            sumXX += x * x;
            sumYY += y * y;
            sumXY += x * y;
        }
        if (n < 3) {
            return null;
        }
        double cov = sumXY - sumX * sumY / n;
        double varX = sumXX - sumX * sumX / n;
        double varY = sumYY - sumY * sumY / n;
        if (varX <= 0 || varY <= 0) {
            return null;
        }
        double r = cov / Math.sqrt(varX * varY);
        r = Math.max(-1, Math.min(1, r));
        return new Correlation(a.name(), b.name(), Math.round(r * 1000) / 1000.0, n);
    }
}
