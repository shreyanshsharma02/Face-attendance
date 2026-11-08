package com.shreyansh.attendance.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SaveEmbeddingRequest(
        @NotNull List<Double> embedding
) {}
