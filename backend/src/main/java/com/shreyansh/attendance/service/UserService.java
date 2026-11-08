package com.shreyansh.attendance.service;

import com.shreyansh.attendance.entity.User;
import com.shreyansh.attendance.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

@Service
public class UserService implements UserDetailsService, ApplicationRunner {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.seed-username:admin}")
    private String seedUsername;

    @Value("${app.admin.seed-password:admin123}")
    private String seedPassword;

    public UserService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    // Seed the first admin on startup if no users exist
    @Override
    public void run(ApplicationArguments args) {
        if (users.count() == 0) {
            users.save(new User(seedUsername, passwordEncoder.encode(seedPassword)));
            System.out.println(">>> Seeded default admin user: " + seedUsername);
        }
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = users.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
    }

    @Transactional
    public User createAdmin(String username, String rawPassword) {
        if (username.isBlank() || rawPassword.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required");
        }
        if (users.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (rawPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }
        return users.save(new User(username, passwordEncoder.encode(rawPassword)));
    }

    @Transactional(readOnly = true)
    public List<User> listAdmins() {
        return users.findAll();
    }
}
