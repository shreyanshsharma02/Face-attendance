
package com.shreyansh.attendance.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(
        name = "attendance",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_employee_attendance_date",
                columnNames = {"employee_id", "attendance_date"}
        ),
        indexes = @Index(
                name = "idx_attendance_date",
                columnList = "attendance_date"
        )
)
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "check_in_at", nullable = false)
    private Instant checkInAt;

    protected Attendance() {}

    public Attendance(
            Employee employee,
            LocalDate attendanceDate,
            Instant checkInAt
    ) {
        this.employee = employee;
        this.attendanceDate = attendanceDate;
        this.checkInAt = checkInAt;
    }

    public Long getId() { return id; }
    public Employee getEmployee() { return employee; }
    public LocalDate getAttendanceDate() { return attendanceDate; }
    public Instant getCheckInAt() { return checkInAt; }
}
