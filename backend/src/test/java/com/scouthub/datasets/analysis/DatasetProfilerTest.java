package com.scouthub.datasets.analysis;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.StringReader;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DatasetProfilerTest {

    private final DatasetProfiler profiler = new DatasetProfiler();

    private DatasetProfile profile(String content) throws IOException {
        return profiler.profile(new CsvParser(1000, 50).parse(new StringReader(content)));
    }

    private static ColumnProfile column(DatasetProfile p, String name) {
        return p.columns().stream().filter(c -> c.name().equals(name)).findFirst().orElseThrow();
    }

    @Test
    void infersColumnTypes() throws IOException {
        DatasetProfile p = profile("""
                age,value,active,joined,league,name
                21,12.5,oui,2024-07-01,Botola,A
                25,8,non,2023-01-15,Botola,B
                30,40.25,oui,2022-08-30,Ligue 1,C
                27,3,non,01/09/2021,Botola,D
                """);
        assertEquals(ColumnType.INTEGER, column(p, "age").type());
        assertEquals(ColumnType.DECIMAL, column(p, "value").type());
        assertEquals(ColumnType.BOOLEAN, column(p, "active").type());
        assertEquals(ColumnType.DATE, column(p, "joined").type());
        assertEquals(ColumnType.CATEGORY, column(p, "league").type());
        assertEquals(ColumnType.TEXT, column(p, "name").type());
    }

    @Test
    void computesNumericStatistics() throws IOException {
        DatasetProfile p = profile("x\n1\n2\n3\n4\n100\n");
        ColumnProfile x = column(p, "x");
        assertEquals(1.0, x.min());
        assertEquals(100.0, x.max());
        assertEquals(22.0, x.mean(), 1e-9);
        assertEquals(3.0, x.median(), 1e-9);
        assertEquals(2.0, x.q1(), 1e-9);
        assertEquals(4.0, x.q3(), 1e-9);
        assertEquals(1, x.outliers());
        assertEquals(43.6176, x.stdDev(), 1e-3);
    }

    @Test
    void countsMissingAndInvalidValues() throws IOException {
        DatasetProfile p = profile("""
                minutes
                900
                NA
                1200

                450
                850
                1000
                700
                600
                300
                250
                100
                abc
                500
                400
                350
                800
                950
                1100
                1150
                1300
                1250
                """);
        ColumnProfile m = column(p, "minutes");
        assertEquals(ColumnType.INTEGER, m.type());
        assertEquals(1, m.missing());
        assertEquals(1, m.invalid());
    }

    @Test
    void acceptsDecimalComma() {
        assertEquals(12.5, DatasetProfiler.parseNumber("12,5"));
        assertNull(DatasetProfiler.parseNumber("12,5,3"));
    }

    @Test
    void reportsDateRange() throws IOException {
        DatasetProfile p = profile("d\n2024-03-01\n2023-12-31\n2024-01-15T10:30:00\n");
        ColumnProfile d = column(p, "d");
        assertEquals("2023-12-31", d.minDate());
        assertEquals("2024-03-01", d.maxDate());
    }

    @Test
    void findsTopValuesForCategories() throws IOException {
        DatasetProfile p = profile("pos\nDF\nMF\nDF\nFW\nDF\nMF\n");
        ColumnProfile pos = column(p, "pos");
        assertEquals("DF", pos.topValues().get(0).value());
        assertEquals(3, pos.topValues().get(0).count());
    }

    @Test
    void detectsDuplicateRows() throws IOException {
        DatasetProfile p = profile("a,b\n1,2\n1,2\n3,4\n1,2\n");
        assertEquals(2, p.duplicateRows());
    }

    @Test
    void detectsCoordinatesAndCorrelations() throws IOException {
        DatasetProfile p = profile("""
                lat,lon,goals,shots
                34.02,-6.83,1,3
                33.57,-7.59,2,6
                31.63,-8.00,3,9
                35.76,-5.83,4,13
                """);
        assertEquals(ColumnProfile.GeoRole.LATITUDE, column(p, "lat").geoRole());
        assertEquals(ColumnProfile.GeoRole.LONGITUDE, column(p, "lon").geoRole());
        DatasetProfile.Correlation top = p.correlations().get(0);
        assertTrue(top.coefficient() > 0.99, "goals and shots move together");
    }

    @Test
    void ignoresIdentifiersInCorrelations() throws IOException {
        DatasetProfile p = profile("player_id,goals,shots\n1,1,3\n2,2,6\n3,3,9\n4,4,13\n");
        assertTrue(p.correlations().stream().noneMatch(c -> c.columnA().equals("player_id") || c.columnB().equals("player_id")));
        assertEquals(1, p.correlations().size());
    }
}
