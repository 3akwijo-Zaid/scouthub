package com.scouthub.datasets.analysis;

import java.util.List;

/**
 * A chart suggested for an imported dataset (CdC §6 "Recommandation automatique de visualisations").
 *
 * @param chart   chart type the web app should draw
 * @param columns columns to use, in the order the chart expects them (x first, then y)
 * @param reason  why this chart is suggested, shown to the user
 */
public record VizRecommendation(ChartType chart, String title, List<String> columns, String reason, int priority) {

    public enum ChartType {
        MAP,
        LINE,
        SCATTER,
        BAR,
        PIE,
        HISTOGRAM,
        BOX
    }
}
