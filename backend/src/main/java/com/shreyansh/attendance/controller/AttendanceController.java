package com.shreyansh.attendance.controller;

import com.shreyansh.attendance.entity.Attendance;
import com.shreyansh.attendance.service.AttendanceService;
import com.shreyansh.attendance.service.AttendanceAlreadyMarkedException;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api")
public class AttendanceController {

    private final AttendanceService service;
    private final ZoneId zoneId;

    public AttendanceController(
            AttendanceService service,
            @org.springframework.beans.factory.annotation.Value(
                    "${app.timezone:Asia/Kolkata}") String timezone) {
        this.service = service;
        this.zoneId = ZoneId.of(timezone);
    }

    public record MarkAttendanceRequest(Long employeeId) {}

    public record AttendanceResponse(
            Long id,
            Long employeeId,
            String employeeCode,
            String employeeName,
            LocalDate attendanceDate,
            java.time.Instant checkInAt,
            boolean late,
            long minutesLate
    ) {}

    @PostMapping("/internal/attendance/mark")
    public AttendanceResponse mark(
            @RequestBody MarkAttendanceRequest request) {
        return toResponse(service.markAttendance(
                request.employeeId()
        ));
    }

    @GetMapping("/attendance")
    public List<AttendanceResponse> list(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        List<Attendance> records = date == null
                ? service.getAllAttendance()
                : service.getAttendanceForDate(date);

        return records.stream().map(this::toResponse).toList();
    }

    @GetMapping(value = "/attendance/export", produces = "text/csv")
    public ResponseEntity<String> exportCsv(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        List<Attendance> records = date == null
                ? service.getAllAttendance()
                : service.getAttendanceForDate(date);

        StringBuilder csv = new StringBuilder(
                "employee_code,name,date,check_in_time,status,minutes_late\n");
        for (Attendance a : records) {
            long late = service.minutesLate(a);
            csv.append(csvCell(a.getEmployee().getEmployeeCode())).append(',')
               .append(csvCell(a.getEmployee().getFullName())).append(',')
               .append(a.getAttendanceDate()).append(',')
               .append(a.getCheckInAt().atZone(zoneId).toLocalTime()
                       .withNano(0)).append(',')
               .append(late > 0 ? "late" : "on_time").append(',')
               .append(late).append('\n');
        }

        String filename = "attendance" + (date == null ? "" : "-" + date) + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.toString());
    }

    /** Quotes a CSV cell and neutralises spreadsheet formula injection. */
    private static String csvCell(String value) {
        String v = value == null ? "" : value;
        if (!v.isEmpty() && "=+-@".indexOf(v.charAt(0)) >= 0) {
            v = "'" + v;
        }
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }

    @ExceptionHandler(AttendanceAlreadyMarkedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public java.util.Map<String, String> duplicateAttendance(
            AttendanceAlreadyMarkedException ex) {
        return java.util.Map.of(
                "code", "ATTENDANCE_ALREADY_MARKED",
                "message", ex.getMessage()
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public java.util.Map<String, String> badRequest(
            IllegalArgumentException ex) {
        return java.util.Map.of("message", ex.getMessage());
    }

    private AttendanceResponse toResponse(Attendance a) {
        long late = service.minutesLate(a);
        return new AttendanceResponse(
                a.getId(),
                a.getEmployee().getId(),
                a.getEmployee().getEmployeeCode(),
                a.getEmployee().getFullName(),
                a.getAttendanceDate(),
                a.getCheckInAt(),
                late > 0,
                late
        );
    }
}