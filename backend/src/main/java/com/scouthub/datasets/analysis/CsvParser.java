package com.scouthub.datasets.analysis;

import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Small RFC 4180 CSV parser with delimiter detection.
 * <p>
 * Handles quoted fields, escaped quotes ({@code ""}), line breaks inside quotes, CRLF line endings
 * and a UTF-8 byte order mark. The delimiter is detected on the header line among
 * {@code , ; \t |} (French Excel exports use {@code ;}).
 */
public final class CsvParser {

    private static final char[] CANDIDATE_DELIMITERS = {',', ';', '\t', '|'};

    private final int maxRows;
    private final int maxColumns;

    public CsvParser(int maxRows, int maxColumns) {
        this.maxRows = maxRows;
        this.maxColumns = maxColumns;
    }

    public ParsedCsv parse(Reader reader) throws IOException {
        String content = readAll(reader);
        if (!content.isEmpty() && content.charAt(0) == '﻿') {
            content = content.substring(1);
        }
        if (content.isBlank()) {
            throw new CsvFormatException("Le fichier est vide.");
        }

        char delimiter = detectDelimiter(content);
        List<List<String>> records = splitRecords(content, delimiter);
        if (records.isEmpty()) {
            throw new CsvFormatException("Le fichier ne contient aucune ligne lisible.");
        }

        List<String> header = cleanHeader(records.get(0));
        if (header.size() > maxColumns) {
            throw new CsvFormatException("Trop de colonnes : " + header.size() + " (maximum " + maxColumns + ").");
        }

        List<List<String>> rows = new ArrayList<>(records.size() - 1);
        int ragged = 0;
        for (int i = 1; i < records.size(); i++) {
            List<String> record = records.get(i);
            if (isBlankRecord(record)) {
                continue;
            }
            if (rows.size() >= maxRows) {
                throw new CsvFormatException("Trop de lignes : plus de " + maxRows + " lignes de données.");
            }
            if (record.size() != header.size()) {
                ragged++;
            }
            rows.add(normalize(record, header.size()));
        }
        return new ParsedCsv(List.copyOf(header), rows, delimiter, ragged);
    }

    // ------------------------------------------------------------------ helpers

    private static String readAll(Reader reader) throws IOException {
        StringBuilder sb = new StringBuilder();
        char[] buffer = new char[8192];
        int n;
        while ((n = reader.read(buffer)) != -1) {
            sb.append(buffer, 0, n);
        }
        return sb.toString();
    }

    /** Picks the candidate delimiter that appears most often outside quotes on the first line. */
    static char detectDelimiter(String content) {
        int[] counts = new int[CANDIDATE_DELIMITERS.length];
        boolean inQuotes = false;
        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes && (c == '\n' || c == '\r')) {
                break;
            } else if (!inQuotes) {
                for (int k = 0; k < CANDIDATE_DELIMITERS.length; k++) {
                    if (c == CANDIDATE_DELIMITERS[k]) {
                        counts[k]++;
                    }
                }
            }
        }
        int best = 0;
        for (int k = 1; k < counts.length; k++) {
            if (counts[k] > counts[best]) {
                best = k;
            }
        }
        return CANDIDATE_DELIMITERS[best];
    }

    private static List<List<String>> splitRecords(String content, char delimiter) {
        List<List<String>> records = new ArrayList<>();
        List<String> current = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;
        int length = content.length();

        for (int i = 0; i < length; i++) {
            char c = content.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < length && content.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == delimiter) {
                current.add(field.toString());
                field.setLength(0);
            } else if (c == '\r' || c == '\n') {
                current.add(field.toString());
                field.setLength(0);
                records.add(current);
                current = new ArrayList<>();
                if (c == '\r' && i + 1 < length && content.charAt(i + 1) == '\n') {
                    i++;
                }
            } else {
                field.append(c);
            }
        }
        if (inQuotes) {
            throw new CsvFormatException("Guillemet non fermé dans le fichier.");
        }
        if (field.length() > 0 || !current.isEmpty()) {
            current.add(field.toString());
            records.add(current);
        }
        return records;
    }

    /** Trims names, replaces blanks with column_N and makes duplicates unique (name_2, name_3…). */
    static List<String> cleanHeader(List<String> raw) {
        List<String> header = new ArrayList<>(raw.size());
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < raw.size(); i++) {
            String name = raw.get(i).trim();
            if (name.isEmpty()) {
                name = "column_" + (i + 1);
            }
            String unique = name;
            int suffix = 2;
            while (!seen.add(unique.toLowerCase())) {
                unique = name + "_" + suffix++;
            }
            header.add(unique);
        }
        return header;
    }

    private static boolean isBlankRecord(List<String> record) {
        for (String cell : record) {
            if (!cell.isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static List<String> normalize(List<String> record, int width) {
        List<String> row = new ArrayList<>(width);
        for (int i = 0; i < width; i++) {
            row.add(i < record.size() ? record.get(i).trim() : "");
        }
        return row;
    }

    /** Raised when the file cannot be read as a CSV table. The message is shown to the user. */
    public static class CsvFormatException extends RuntimeException {

        private static final long serialVersionUID = 1L;

        public CsvFormatException(String message) {
            super(message);
        }
    }
}
