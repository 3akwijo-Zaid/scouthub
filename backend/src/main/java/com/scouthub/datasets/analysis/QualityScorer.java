package com.scouthub.datasets.analysis;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Computes the data quality score shown after a CSV import (CdC §6 "Score de qualité des données").
 * <p>
 * score = 100 × (0.40·completeness + 0.20·uniqueness + 0.25·validity + 0.15·consistency)
 */
public final class QualityScorer {

    static final double W_COMPLETENESS = 0.40;
    static final double W_UNIQUENESS = 0.20;
    static final double W_VALIDITY = 0.25;
    static final double W_CONSISTENCY = 0.15;

    /** Columns with at least this share of missing values are reported as an issue. */
    static final double MISSING_ISSUE_THRESHOLD = 0.20;
    static final int MAX_ISSUES = 15;

    public QualityReport score(DatasetProfile profile) {
        int rows = profile.rowCount();
        int columns = profile.columns().size();
        long totalCells = (long) rows * columns;

        long missing = 0;
        long typedValues = 0;
        long invalid = 0;
        for (ColumnProfile c : profile.columns()) {
            missing += c.missing();
            if (isTyped(c.type())) {
                typedValues += c.count();
                invalid += c.invalid();
            }
        }

        double completeness = totalCells == 0 ? 1 : 1 - (double) missing / totalCells;
        double uniqueness = rows == 0 ? 1 : 1 - (double) profile.duplicateRows() / rows;
        double validity = typedValues == 0 ? 1 : 1 - (double) invalid / typedValues;
        double consistency = rows == 0 ? 1 : 1 - (double) profile.raggedRows() / rows;

        double score = 100 * (W_COMPLETENESS * completeness + W_UNIQUENESS * uniqueness
                + W_VALIDITY * validity + W_CONSISTENCY * consistency);
        score = Math.round(score * 10) / 10.0;

        return new QualityReport(score, grade(score),
                round(completeness), round(uniqueness), round(validity), round(consistency),
                issues(profile));
    }

    static String grade(double score) {
        if (score >= 90) {
            return "A";
        }
        if (score >= 75) {
            return "B";
        }
        if (score >= 60) {
            return "C";
        }
        return "D";
    }

    private static boolean isTyped(ColumnType type) {
        return type.isNumeric() || type == ColumnType.DATE || type == ColumnType.BOOLEAN;
    }

    private static List<String> issues(DatasetProfile profile) {
        List<String> issues = new ArrayList<>();
        if (profile.raggedRows() > 0) {
            issues.add(profile.raggedRows() + " ligne(s) n'ont pas le même nombre de colonnes que l'en-tête.");
        }
        if (profile.duplicateRows() > 0) {
            issues.add(profile.duplicateRows() + " ligne(s) en double.");
        }
        for (ColumnProfile c : profile.columns()) {
            if (c.missingRatio() >= MISSING_ISSUE_THRESHOLD) {
                issues.add(String.format(Locale.FRANCE, "La colonne « %s » a %.0f %% de valeurs manquantes.",
                        c.name(), c.missingRatio() * 100));
            }
            if (c.invalid() > 0) {
                issues.add(String.format(Locale.FRANCE, "La colonne « %s » contient %d valeur(s) qui ne sont pas de type %s.",
                        c.name(), c.invalid(), label(c.type())));
            }
            if (c.outliers() != null && c.outliers() > 0) {
                issues.add(String.format(Locale.FRANCE, "La colonne « %s » contient %d valeur(s) aberrante(s) (règle de l'IQR).",
                        c.name(), c.outliers()));
            }
            if (c.distinct() == 1 && c.count() > 1) {
                issues.add(String.format(Locale.FRANCE, "La colonne « %s » n'a qu'une seule valeur.", c.name()));
            }
            if (c.count() == 0) {
                issues.add(String.format(Locale.FRANCE, "La colonne « %s » est entièrement vide.", c.name()));
            }
        }
        return List.copyOf(issues.subList(0, Math.min(MAX_ISSUES, issues.size())));
    }

    private static String label(ColumnType type) {
        return switch (type) {
            case INTEGER -> "nombre entier";
            case DECIMAL -> "nombre";
            case BOOLEAN -> "booléen";
            case DATE -> "date";
            case CATEGORY -> "catégorie";
            case TEXT -> "texte";
        };
    }

    private static double round(double v) {
        return Math.round(v * 1000) / 1000.0;
    }
}
