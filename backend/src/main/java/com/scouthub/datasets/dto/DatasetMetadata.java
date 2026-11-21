package com.scouthub.datasets.dto;

/** Information typed by the user when importing a CSV (CdC §5.3). */
public record DatasetMetadata(String title, String description, String category, String source) {
}
