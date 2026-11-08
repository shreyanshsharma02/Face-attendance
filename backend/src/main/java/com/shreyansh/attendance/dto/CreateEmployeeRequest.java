package com.shreyansh.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateEmployeeRequest(
        @NotBlank @Size(max = 50) String employeeCode,
        @NotBlank @Size(max = 150) String fullName
) {}