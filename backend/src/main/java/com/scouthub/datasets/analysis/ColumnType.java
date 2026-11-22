package com.scouthub.datasets.analysis;

/** Type inferred for a dataset column. */
public enum ColumnType {
    INTEGER,
    DECIMAL,
    BOOLEAN,
    DATE,
    /** Text with few distinct values (league, position, country…). */
    CATEGORY,
    /** Free text or identifiers. */
    TEXT;

    public boolean isNumeric() {
        return this == INTEGER || this == DECIMAL;
    }
}
