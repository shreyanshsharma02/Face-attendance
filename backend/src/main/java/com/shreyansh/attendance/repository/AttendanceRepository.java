package com.shreyansh.attendance.repository;

import com.shreyansh.attendance.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface AttendanceRepository
        extends JpaRepository<Attendance, Long> {

    boolean existsByEmployee_IdAndAttendanceDate(
            Long employeeId, LocalDate attendanceDate
    );

    List<Attendance> findAllByAttendanceDateOrderByCheckInAtDesc(
            LocalDate attendanceDate
    );

    List<Attendance> findAllByOrderByAttendanceDateDescCheckInAtDesc();
}
