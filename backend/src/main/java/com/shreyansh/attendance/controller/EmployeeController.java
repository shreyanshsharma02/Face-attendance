package com.shreyansh.attendance.controller;

import com.shreyansh.attendance.dto.CreateEmployeeRequest;
import com.shreyansh.attendance.dto.SaveEmbeddingRequest;
import com.shreyansh.attendance.entity.Employee;
import com.shreyansh.attendance.service.EmployeeService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService service;

    public EmployeeController(EmployeeService service) {
        this.service = service;
    }

    public record EmployeeResponse(
            Long id, String employeeCode,
            String fullName, boolean active,
            boolean faceEnrolled
    ) {}

    public record ActiveRequest(boolean active) {}

    @PostMapping
    public EmployeeResponse register(
            @Valid @RequestBody CreateEmployeeRequest request) {
        return toResponse(service.register(request.employeeCode(), request.fullName()));
    }

    @GetMapping
    public List<EmployeeResponse> list() {
        return service.getAllEmployees().stream().map(this::toResponse).toList();
    }

    @PatchMapping("/{id}/active")
    public EmployeeResponse setActive(
            @PathVariable Long id,
            @RequestBody ActiveRequest request) {
        return toResponse(service.setActive(id, request.active()));
    }

    @PutMapping("/{id}/embedding")
    public EmployeeResponse saveEmbedding(
            @PathVariable Long id,
            @Valid @RequestBody SaveEmbeddingRequest request) {
        return toResponse(service.saveEmbedding(id, request.embedding()));
    }

    @GetMapping("/embeddings")
    public Map<String, List<Double>> getEmbeddings() {
        return service.getEmbeddingGallery();
    }

    private EmployeeResponse toResponse(Employee e) {
        return new EmployeeResponse(
                e.getId(),
                e.getEmployeeCode(),
                e.getFullName(),
                e.isActive(),
                e.getFaceTemplate() != null
        );
    }
}