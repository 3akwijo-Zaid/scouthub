package com.scouthub.common;

import com.scouthub.datasets.DatasetAccessDeniedException;
import com.scouthub.datasets.DatasetImportException;
import com.scouthub.datasets.DatasetNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * Centralised error handling (CdC §10): every error is returned as an RFC 7807 problem
 * ({@code application/problem+json}) with a message the web and mobile apps can show as is.
 * Other features add their own handlers here.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(DatasetNotFoundException.class)
    public ProblemDetail notFound(DatasetNotFoundException e) {
        return problem(HttpStatus.NOT_FOUND, "Ressource introuvable", e.getMessage());
    }

    @ExceptionHandler(DatasetImportException.class)
    public ProblemDetail badDataset(DatasetImportException e) {
        return problem(HttpStatus.BAD_REQUEST, "Requête invalide", e.getMessage());
    }

    @ExceptionHandler(DatasetAccessDeniedException.class)
    public ProblemDetail forbidden(DatasetAccessDeniedException e) {
        return problem(HttpStatus.FORBIDDEN, "Accès refusé", e.getMessage());
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MissingServletRequestPartException.class})
    public ProblemDetail missingParameter(Exception e) {
        return problem(HttpStatus.BAD_REQUEST, "Paramètre manquant", e.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail tooLarge(MaxUploadSizeExceededException e) {
        return problem(HttpStatus.PAYLOAD_TOO_LARGE, "Fichier trop volumineux",
                "Le fichier dépasse la taille maximale autorisée.");
    }

    private static ProblemDetail problem(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        return problem;
    }
}
