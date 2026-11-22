package com.scouthub.datasets.analysis;

import java.util.List;

/**
 * Result of parsing a CSV file.
 *
 * @param header      column names (cleaned: trimmed, never blank, unique)
 * @param rows        data rows, each padded or truncated to {@code header.size()} cells
 * @param delimiter   delimiter detected in the header line
 * @param raggedRows  number of rows whose original cell count differed from the header
 */
public record ParsedCsv(List<String> header, List<List<String>> rows, char delimiter, int raggedRows) {

    public int rowCount() {
        return rows.size();
    }

    public int columnCount() {
        return header.size();
    }
}
