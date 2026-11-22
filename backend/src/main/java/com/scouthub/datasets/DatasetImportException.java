package com.scouthub.datasets;

/** The uploaded file or the request is invalid. The message is shown to the user. */
public class DatasetImportException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public DatasetImportException(String message) {
        super(message);
    }

    public DatasetImportException(String message, Throwable cause) {
        super(message, cause);
    }
}
