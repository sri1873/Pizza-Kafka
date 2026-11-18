package com.kafka.learn;

import com.kafka.learn.dto.AddressDTO;
import com.kafka.learn.dto.UserRequestDTO;
import com.kafka.learn.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/createUser")
    public void createUser(@RequestBody UserRequestDTO user) {
        userService.createUser(user);
    }

    @PostMapping("/addAddress")
    public void addAddress(@RequestBody AddressDTO addressDto) {
        userService.addAddress(addressDto.getUserId(), addressDto);
    }

    @GetMapping("/getUserAddresses")
    public List<AddressDTO> getUserAddresses(@RequestParam UUID userId) {
        return userService.getUserAddresses(userId);
    }
}
