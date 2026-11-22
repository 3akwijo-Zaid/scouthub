package com.scouthub.datasets.analysis;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.StringReader;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QualityScorerTest {

    private final QualityScorer scorer = new QualityScorer();

    private QualityReport score(String content) throws IOException {
        ParsedCsv csv = new CsvParser(1000, 50).parse(new StringReader(content));
        return scorer.score(new DatasetProfiler().profile(csv));
    }

    @Test
    void cleanDatasetScoresOneHundred() throws IOException {
        QualityReport r = score("name,age\nA,20\nB,21\nC,22\n");
        assertEquals(100.0, r.score());
        assertEquals("A", r.grade());
        assertTrue(r.issues().isEmpty());
    }

    @Test
    void penalisesMissingDuplicateAndRaggedRows() throws IOException {
        // 4 rows × 2 columns = 8 cells, 2 missing → completeness 0.75
        // 1 duplicate row out of 4 → uniqueness 0.75
        // 1 ragged row out of 4 → consistency 0.75
        QualityReport r = score("name,age\nA,20\nA,20\nB\n,22\n");
        assertEquals(0.75, r.completeness(), 1e-9);
        assertEquals(0.75, r.uniqueness(), 1e-9);
        assertEquals(0.75, r.consistency(), 1e-9);
        assertEquals(1.0, r.validity(), 1e-9);
        // 100 × (0.4·0.75 + 0.2·0.75 + 0.25·1 + 0.15·0.75) = 81.25 → 81.3
        assertEquals(81.3, r.score(), 1e-9);
        assertEquals("B", r.grade());
        assertTrue(r.issues().stream().anyMatch(i -> i.contains("en double")));
    }

    @Test
    void gradesFollowThresholds() {
        assertEquals("A", QualityScorer.grade(90));
        assertEquals("B", QualityScorer.grade(75));
        assertEquals("C", QualityScorer.grade(60));
        assertEquals("D", QualityScorer.grade(59.9));
    }
}
