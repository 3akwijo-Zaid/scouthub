package com.scouthub.datasets;

/** The current user is not allowed to change this dataset. */
public class DatasetAccessDeniedException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public DatasetAccessDeniedException(String message) {
        super(message);
    }
}
