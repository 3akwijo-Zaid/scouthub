package com.scouthub.datasets.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** A column with its inferred type and its statistics (ColumnProfile as JSON). */
public record ColumnInfo(int position, String name, String type, JsonNode profile) {
}
