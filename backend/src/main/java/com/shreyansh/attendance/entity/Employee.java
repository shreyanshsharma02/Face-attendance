package com.shreyansh.attendance.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "face_template")
    private byte[] faceTemplate;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Employee() {}

    public Employee(String employeeCode, String fullName) {
        this.employeeCode = employeeCode;
        this.fullName = fullName;
    }

    public Long getId() { return id; }
    public String getEmployeeCode() { return employeeCode; }
    public String getFullName() { return fullName; }
    public byte[] getFaceTemplate() { return faceTemplate; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void setFaceTemplate(byte[] faceTemplate) {
        this.faceTemplate = faceTemplate;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
