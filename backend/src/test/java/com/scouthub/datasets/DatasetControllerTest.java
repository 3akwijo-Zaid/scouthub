package com.scouthub.datasets;

import com.scouthub.common.ApiExceptionHandler;
import com.scouthub.datasets.dto.DatasetSummary;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DatasetController.class)
@Import(ApiExceptionHandler.class)
class DatasetControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private DatasetService service;

    private static DatasetSummary summary() {
        return new DatasetSummary(7L, "Joueurs Botola", null, "Football", "Kaggle", "botola.csv",
                "analyst@esi.ac.ma", OffsetDateTime.parse("2026-11-21T18:00:00Z"), 120, 8, 92.5, "A");
    }

    @Test
    @WithMockUser
    void listsDatasets() throws Exception {
        when(service.list(null, null)).thenReturn(List.of(summary()));

        mvc.perform(get("/datasets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(7))
                .andExpect(jsonPath("$[0].qualityGrade").value("A"));
    }

    @Test
    @WithMockUser(username = "analyst@esi.ac.ma", roles = "ANALYST")
    void importsCsvAndReturnsLocation() throws Exception {
        when(service.importCsv(any(), any(), eq("analyst@esi.ac.ma"))).thenReturn(summary());
        MockMultipartFile file = new MockMultipartFile("file", "botola.csv", "text/csv",
                "name,club\nHakimi,PSG\n".getBytes());

        mvc.perform(multipart("/datasets").file(file).param("title", "Joueurs Botola").with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/datasets/7"))
                .andExpect(jsonPath("$.title").value("Joueurs Botola"));
    }

    @Test
    @WithMockUser
    void unknownDatasetReturnsProblem404() throws Exception {
        when(service.get(anyLong())).thenThrow(new DatasetNotFoundException(99));

        mvc.perform(get("/datasets/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Dataset 99 introuvable."));
    }

    @Test
    @WithMockUser(roles = "ANALYST")
    void invalidFileReturnsProblem400() throws Exception {
        when(service.importCsv(any(), any(), any())).thenThrow(new DatasetImportException("Le fichier est vide."));
        MockMultipartFile file = new MockMultipartFile("file", "vide.csv", "text/csv", new byte[]{' '});

        mvc.perform(multipart("/datasets").file(file).param("title", "Vide").with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Le fichier est vide."));
    }
}
