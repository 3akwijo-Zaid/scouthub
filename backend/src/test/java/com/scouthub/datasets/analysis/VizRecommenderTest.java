package com.scouthub.datasets.analysis;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.StringReader;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VizRecommenderTest {

    private final VizRecommender recommender = new VizRecommender();

    private List<VizRecommendation> recommend(String content) throws IOException {
        ParsedCsv csv = new CsvParser(1000, 50).parse(new StringReader(content));
        return recommender.recommend(new DatasetProfiler().profile(csv));
    }

    private static boolean has(List<VizRecommendation> recs, VizRecommendation.ChartType type) {
        return recs.stream().anyMatch(r -> r.chart() == type);
    }

    @Test
    void suggestsMapFirstWhenCoordinatesArePresent() throws IOException {
        List<VizRecommendation> recs = recommend("""
                stadium,latitude,longitude,capacity
                Prince Moulay Abdellah,34.00,-6.85,68700
                Mohammed V,33.58,-7.65,45000
                Grand Stade de Marrakech,31.70,-8.06,45240
                """);
        assertEquals(VizRecommendation.ChartType.MAP, recs.get(0).chart());
        assertEquals(List.of("latitude", "longitude"), recs.get(0).columns());
    }

    @Test
    void suggestsLineForDatesAndScatterForCorrelatedNumbers() throws IOException {
        List<VizRecommendation> recs = recommend("""
                date,goals,shots
                2024-01-01,1,3
                2024-02-01,2,6
                2024-03-01,3,9
                2024-04-01,4,13
                """);
        assertTrue(has(recs, VizRecommendation.ChartType.LINE));
        assertTrue(has(recs, VizRecommendation.ChartType.SCATTER));
    }

    @Test
    void suggestsBarAndPieForCategories() throws IOException {
        List<VizRecommendation> recs = recommend("""
                position,value
                DF,10
                MF,20
                FW,30
                DF,12
                MF,25
                FW,35
                DF,9
                MF,22
                """);
        assertTrue(has(recs, VizRecommendation.ChartType.BAR));
        assertTrue(has(recs, VizRecommendation.ChartType.PIE));
    }

    @Test
    void ignoresIdentifierColumns() throws IOException {
        List<VizRecommendation> recs = recommend("player_id,value\n1,10\n2,20\n3,30\n");
        assertFalse(recs.stream().anyMatch(r -> r.columns().contains("player_id")));
    }
}
