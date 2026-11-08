package com.shreyansh.attendance.service;

import com.shreyansh.attendance.entity.Attendance;
import com.shreyansh.attendance.entity.Employee;
import com.shreyansh.attendance.repository.AttendanceRepository;
import com.shreyansh.attendance.repository.EmployeeRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class AttendanceService {

    private final EmployeeRepository employees;
    private final AttendanceRepository attendance;
    private final ZoneId zoneId;
    private final LocalTime workStart;
    private final int lateGraceMinutes;

    public AttendanceService(
            EmployeeRepository employees,
            AttendanceRepository attendance,
            @Value("${app.timezone:Asia/Kolkata}") String timezone,
            @Value("${app.attendance.work-start:09:30}") String workStart,
            @Value("${app.attendance.late-grace-minutes:10}") int lateGraceMinutes) {
        this.employees = employees;
        this.attendance = attendance;
        this.zoneId = ZoneId.of(timezone);
        this.workStart = LocalTime.parse(workStart);
        this.lateGraceMinutes = lateGraceMinutes;
    }

    /**
     * Minutes past the official start time, or 0 when the check-in is on
     * time. Check-ins inside the grace window count as on time.
     */
    public long minutesLate(Attendance record) {
        LocalTime checkIn = record.getCheckInAt().atZone(zoneId).toLocalTime();
        long minutes = ChronoUnit.MINUTES.between(workStart, checkIn);
        return minutes > lateGraceMinutes ? minutes : 0;
    }

    @Transactional
    public Attendance markAttendance(Long employeeId) {
        Employee employee = employees.findById(employeeId)
                .filter(Employee::isActive)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Employee not found or inactive"
                        ));

        LocalDate today = LocalDate.now(zoneId);

        if (attendance.existsByEmployee_IdAndAttendanceDate(
                employeeId, today)) {
            throw new AttendanceAlreadyMarkedException();
        }

        Attendance record = new Attendance(
                employee, today, Instant.now()
        );

        // Flush here so the unique constraint is checked now.
        // It also protects against simultaneous scans.
        try {
            return attendance.saveAndFlush(record);
        } catch (DataIntegrityViolationException ex) {
            throw new AttendanceAlreadyMarkedException();
        }
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAllAttendance() {
        return attendance
                .findAllByOrderByAttendanceDateDescCheckInAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Attendance> getAttendanceForDate(LocalDate date) {
        return attendance
                .findAllByAttendanceDateOrderByCheckInAtDesc(date);
    }
}
