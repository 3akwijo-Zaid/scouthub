package com.scouthub.datasets;

public class DatasetNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public DatasetNotFoundException(long id) {
        super("Dataset " + id + " introuvable.");
    }
}
