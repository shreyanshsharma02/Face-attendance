package com.shreyansh.attendance.controller;

import com.shreyansh.attendance.config.JwtUtil;
import com.shreyansh.attendance.entity.User;
import com.shreyansh.attendance.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserService userService;

    public AuthController(
            JwtUtil jwtUtil,
            AuthenticationManager authenticationManager,
            UserService userService) {
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
        this.userService = userService;
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password) {}

    public record LoginResponse(String token) {}

    public record CreateAdminRequest(
            @NotBlank @Size(max = 50) String username,
            @NotBlank @Size(min = 8, max = 100) String password) {}

    public record AdminResponse(
            Long id, String username, Instant createdAt) {}

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        return new LoginResponse(jwtUtil.generate(request.username()));
    }

    @PostMapping("/admins")
    public AdminResponse createAdmin(@Valid @RequestBody CreateAdminRequest request) {
        User user = userService.createAdmin(request.username(), request.password());
        return toResponse(user);
    }

    @GetMapping("/admins")
    public List<AdminResponse> listAdmins() {
        return userService.listAdmins().stream().map(this::toResponse).toList();
    }

    private AdminResponse toResponse(User u) {
        return new AdminResponse(u.getId(), u.getUsername(), u.getCreatedAt());
    }
}
