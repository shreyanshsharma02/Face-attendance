package com.shreyansh.attendance.service;

public class AttendanceAlreadyMarkedException
        extends RuntimeException {

    public AttendanceAlreadyMarkedException() {
        super("Attendance has already been marked for today");
    }
}