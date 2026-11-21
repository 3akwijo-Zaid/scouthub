package com.scouthub.datasets.analysis;

import com.scouthub.datasets.analysis.ColumnProfile.GeoRole;
import com.scouthub.datasets.analysis.DatasetProfile.Correlation;
import com.scouthub.datasets.analysis.VizRecommendation.ChartType;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Suggests charts from the column types of a dataset, with simple rules:
 * coordinates → map, date + number → line, strongly correlated numbers → scatter,
 * category + number → bar, few categories → pie, numbers → histogram, outliers → box plot.
 */
public final class VizRecommender {

    static final int MAX_RECOMMENDATIONS = 8;
    static final double STRONG_CORRELATION = 0.5;

    public List<VizRecommendation> recommend(DatasetProfile profile) {
        List<ColumnProfile> columns = profile.columns();
        // Most informative measures first: highest relative spread (coefficient of variation)
        List<ColumnProfile> measures = columns.stream()
                .filter(c -> c.type().isNumeric() && c.geoRole() == null && !looksLikeIdentifier(c, profile.rowCount()))
                .sorted(Comparator.comparingDouble(VizRecommender::relativeSpread).reversed())
                .toList();
        List<ColumnProfile> categories = columns.stream()
                .filter(c -> c.type() == ColumnType.CATEGORY || c.type() == ColumnType.BOOLEAN)
                .toList();
        List<VizRecommendation> out = new ArrayList<>();

        // Map: one latitude and one longitude column
        Optional<ColumnProfile> lat = columns.stream().filter(c -> c.geoRole() == GeoRole.LATITUDE).findFirst();
        Optional<ColumnProfile> lon = columns.stream().filter(c -> c.geoRole() == GeoRole.LONGITUDE).findFirst();
        if (lat.isPresent() && lon.isPresent()) {
            out.add(new VizRecommendation(ChartType.MAP, "Carte des points",
                    List.of(lat.get().name(), lon.get().name()),
                    "Colonnes de coordonnées détectées (latitude, longitude).", 100));
        }

        // Line: evolution of the first measures over the first date column
        columns.stream().filter(c -> c.type() == ColumnType.DATE && c.distinct() >= 2 && !looksLikeBirthDate(c))
                .findFirst().ifPresent(date ->
                measures.stream().limit(2).forEach(m -> out.add(new VizRecommendation(ChartType.LINE,
                        "Évolution de " + m.name() + " dans le temps",
                        List.of(date.name(), m.name()),
                        "Une colonne de dates et une colonne numérique : une courbe montre la tendance.", 90))));

        // Scatter: strongest correlations
        for (Correlation c : profile.correlations()) {
            if (Math.abs(c.coefficient()) < STRONG_CORRELATION || !isMeasure(c.columnA(), measures) || !isMeasure(c.columnB(), measures)) {
                continue;
            }
            out.add(new VizRecommendation(ChartType.SCATTER,
                    c.columnB() + " en fonction de " + c.columnA(),
                    List.of(c.columnA(), c.columnB()),
                    String.format(Locale.FRANCE, "Corrélation %s (r = %.2f) entre les deux colonnes.",
                            c.coefficient() > 0 ? "positive forte" : "négative forte", c.coefficient()),
                    80 + (int) Math.round(Math.abs(c.coefficient()) * 10)));
            if (out.stream().filter(r -> r.chart() == ChartType.SCATTER).count() >= 2) {
                break;
            }
        }

        // Bar / pie on categories
        for (ColumnProfile cat : categories) {
            if (cat.distinct() >= 3 && cat.distinct() <= 20 && !measures.isEmpty()) {
                ColumnProfile m = measures.get(0);
                out.add(new VizRecommendation(ChartType.BAR,
                        "Moyenne de " + m.name() + " par " + cat.name(),
                        List.of(cat.name(), m.name()),
                        "Une catégorie et une mesure : un diagramme en barres compare les groupes.", 70));
            }
            if (cat.distinct() >= 2 && cat.distinct() <= 6) {
                out.add(new VizRecommendation(ChartType.PIE, "Répartition par " + cat.name(),
                        List.of(cat.name()),
                        "Peu de catégories (" + cat.distinct() + ") : un camembert montre les proportions.", 55));
            } else if (cat.distinct() > 6) {
                out.add(new VizRecommendation(ChartType.BAR, "Nombre de lignes par " + cat.name(),
                        List.of(cat.name()),
                        "Les " + Math.min(cat.distinct(), 10) + " valeurs les plus fréquentes de la catégorie.", 60));
            }
        }

        // Histograms and box plots on measures
        measures.stream().limit(3).forEach(m -> out.add(new VizRecommendation(ChartType.HISTOGRAM,
                "Distribution de " + m.name(), List.of(m.name()),
                "Colonne numérique : l'histogramme montre comment les valeurs se répartissent.", 50)));
        measures.stream().filter(m -> m.outliers() != null && m.outliers() > 0).limit(2).forEach(m ->
                out.add(new VizRecommendation(ChartType.BOX, "Valeurs aberrantes de " + m.name(), List.of(m.name()),
                        m.outliers() + " valeur(s) hors de l'intervalle de l'IQR : une boîte à moustaches les fait ressortir.", 45)));

        return out.stream()
                .sorted(Comparator.comparingInt(VizRecommendation::priority).reversed())
                .limit(MAX_RECOMMENDATIONS)
                .toList();
    }

    /** Identifier columns (id, player_id, or unique integers) are not useful on a chart. */
    static boolean looksLikeIdentifier(ColumnProfile c, int rowCount) {
        if (DatasetProfiler.isIdentifierName(c.name())) {
            return true;
        }
        return c.type() == ColumnType.INTEGER && c.distinct() == c.count() && c.count() > 20 && c.missing() == 0
                && c.count() == rowCount;
    }

    /** A birth date is a date, but plotting a measure "over time" against it makes no sense. */
    static boolean looksLikeBirthDate(ColumnProfile c) {
        String n = c.name().toLowerCase(Locale.ROOT);
        return n.contains("birth") || n.contains("naissance") || n.equals("dob") || n.equals("ddn");
    }

    /** Coefficient of variation |σ / μ| (σ alone when μ = 0); 0 when unknown. */
    static double relativeSpread(ColumnProfile c) {
        if (c.stdDev() == null || c.mean() == null) {
            return 0;
        }
        return c.mean() == 0 ? c.stdDev() : Math.abs(c.stdDev() / c.mean());
    }

    private static boolean isMeasure(String name, List<ColumnProfile> measures) {
        return measures.stream().anyMatch(m -> m.name().equals(name));
    }
}
