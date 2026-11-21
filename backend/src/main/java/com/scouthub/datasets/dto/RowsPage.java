package com.scouthub.datasets.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

/** One page of dataset rows, each row being a JSON object { "column": value }. */
public record RowsPage(List<JsonNode> content, long totalItems, int page, int pageSize) {
}
