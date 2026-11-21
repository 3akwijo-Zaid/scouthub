package com.scouthub.datasets.analysis;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.StringReader;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CsvParserTest {

    private final CsvParser parser = new CsvParser(1000, 50);

    private ParsedCsv parse(String content) throws IOException {
        return parser.parse(new StringReader(content));
    }

    @Test
    void parsesCommaSeparatedFile() throws IOException {
        ParsedCsv csv = parse("name,club,age\nHakimi,PSG,27\nBrahim,Real Madrid,26\n");
        assertEquals(List.of("name", "club", "age"), csv.header());
        assertEquals(2, csv.rowCount());
        assertEquals(List.of("Brahim", "Real Madrid", "26"), csv.rows().get(1));
        assertEquals(',', csv.delimiter());
    }

    @Test
    void detectsSemicolonDelimiterFromFrenchExcel() throws IOException {
        ParsedCsv csv = parse("joueur;valeur\r\nOunahi;12,5\r\n");
        assertEquals(';', csv.delimiter());
        assertEquals(List.of("Ounahi", "12,5"), csv.rows().get(0));
    }

    @Test
    void handlesQuotesEscapedQuotesAndLineBreaksInsideQuotes() throws IOException {
        ParsedCsv csv = parse("name,note\n\"Ziyech, Hakim\",\"Il a dit \"\"top\"\"\nsur 2 lignes\"\n");
        assertEquals(1, csv.rowCount());
        assertEquals("Ziyech, Hakim", csv.rows().get(0).get(0));
        assertEquals("Il a dit \"top\"\nsur 2 lignes", csv.rows().get(0).get(1));
    }

    @Test
    void removesByteOrderMarkAndSkipsBlankLines() throws IOException {
        ParsedCsv csv = parse("﻿a,b\n1,2\n\n,\n3,4");
        assertEquals("a", csv.header().get(0));
        assertEquals(2, csv.rowCount());
    }

    @Test
    void padsShortRowsAndCountsThemAsRagged() throws IOException {
        ParsedCsv csv = parse("a,b,c\n1,2\n1,2,3,4\n");
        assertEquals(List.of("1", "2", ""), csv.rows().get(0));
        assertEquals(List.of("1", "2", "3"), csv.rows().get(1));
        assertEquals(2, csv.raggedRows());
    }

    @Test
    void cleansBlankAndDuplicateHeaderNames() throws IOException {
        ParsedCsv csv = parse(" name ,,Name\n1,2,3\n");
        assertEquals(List.of("name", "column_2", "Name_2"), csv.header());
    }

    @Test
    void rejectsEmptyFile() {
        assertThrows(CsvParser.CsvFormatException.class, () -> parse("   \n"));
    }

    @Test
    void rejectsUnclosedQuote() {
        assertThrows(CsvParser.CsvFormatException.class, () -> parse("a,b\n\"1,2\n"));
    }

    @Test
    void rejectsTooManyRows() {
        CsvParser small = new CsvParser(2, 50);
        assertThrows(CsvParser.CsvFormatException.class,
                () -> small.parse(new StringReader("a\n1\n2\n3\n")));
    }

    @Test
    void rejectsTooManyColumns() {
        CsvParser narrow = new CsvParser(10, 2);
        assertThrows(CsvParser.CsvFormatException.class,
                () -> narrow.parse(new StringReader("a,b,c\n1,2,3\n")));
    }
}
