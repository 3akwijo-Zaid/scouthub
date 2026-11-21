package com.scouthub.datasets;

import com.scouthub.datasets.analysis.ColumnType;
import org.junit.jupiter.api.Test;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class DatasetServiceTest {

    @Test
    void decodesUtf8AndFallsBackToWindows1252() {
        String text = "joueur;équipe\nAmrabat;Fenerbahçe\n";
        assertEquals(text, DatasetService.decode(text.getBytes(StandardCharsets.UTF_8)));
        assertEquals(text, DatasetService.decode(text.getBytes(Charset.forName("windows-1252"))));
    }

    @Test
    void typesValuesByColumn() {
        assertEquals(27L, DatasetService.typedValue("27", ColumnType.INTEGER));
        assertEquals(12.5, DatasetService.typedValue("12,5", ColumnType.DECIMAL));
        assertEquals(Boolean.TRUE, DatasetService.typedValue("oui", ColumnType.BOOLEAN));
        assertEquals("2024-09-01", DatasetService.typedValue("01/09/2024", ColumnType.DATE));
        assertEquals("abc", DatasetService.typedValue("abc", ColumnType.INTEGER));
        assertNull(DatasetService.typedValue("NA", ColumnType.DECIMAL));
    }

    @Test
    void escapesLikeWildcards() {
        assertEquals("50\\%\\_x", DatasetRepository.escapeLike("50%_x"));
    }
}
