package com.shreyansh.attendance.service;

import com.shreyansh.attendance.entity.Employee;
import com.shreyansh.attendance.repository.EmployeeRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmployeeService {

    private final EmployeeRepository employees;
    private final ObjectMapper objectMapper;

    public EmployeeService(EmployeeRepository employees, ObjectMapper objectMapper) {
        this.employees = employees;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Employee register(String code, String name) {
        String employeeCode = code.trim();
        String fullName = name.trim();

        if (employeeCode.isBlank() || fullName.isBlank()) {
            throw new IllegalArgumentException("Employee code and name are required");
        }
        if (employees.findByEmployeeCode(employeeCode).isPresent()) {
            throw new IllegalArgumentException("Employee code already exists");
        }
        return employees.save(new Employee(employeeCode, fullName));
    }

    @Transactional(readOnly = true)
    public List<Employee> getAllEmployees() {
        return employees.findAll();
    }

    @Transactional
    public Employee setActive(Long id, boolean active) {
        Employee emp = employees.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        emp.setActive(active);
        return employees.save(emp);
    }

    @Transactional
    public Employee saveEmbedding(Long id, List<Double> embedding) {
        Employee emp = employees.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        try {
            emp.setFaceTemplate(objectMapper.writeValueAsBytes(embedding));
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize embedding");
        }
        return employees.save(emp);
    }

    @Transactional(readOnly = true)
    public Map<String, List<Double>> getEmbeddingGallery() {
        Map<String, List<Double>> gallery = new HashMap<>();
        for (Employee emp : employees.findAll()) {
            if (!emp.isActive() || emp.getFaceTemplate() == null) continue;
            try {
                @SuppressWarnings("unchecked")
                List<Double> embedding = objectMapper.readValue(emp.getFaceTemplate(), List.class);
                // Key is the numeric DB id so the kiosk can call markAttendance directly
                gallery.put(String.valueOf(emp.getId()), embedding);
            } catch (Exception ignored) {}
        }
        return gallery;
    }
}