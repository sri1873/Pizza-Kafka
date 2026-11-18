package com.kafka.learn.service;

import com.kafka.learn.dto.AddressDTO;
import com.kafka.learn.dto.UserRequestDTO;
import com.kafka.learn.entities.Address;
import com.kafka.learn.entities.User;
import com.kafka.learn.entities.UserRole;
import com.kafka.learn.repositories.AddressRepository;
import com.kafka.learn.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AddressRepository addressRepository;

    //TODO handle invalid role input and throw an exception gracefully
    public void createUser(UserRequestDTO userRequestDTO) {
        User user = new User();
        user.setName(userRequestDTO.getName());
        user.setAddresses(Arrays.asList());
        String role = userRequestDTO.getRole().toUpperCase();
        try {
            user.setRole(UserRole.valueOf(role));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + role);
        }
        userRepository.save(user);
    }

    public void addAddress(UUID userId, AddressDTO addressDto) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        // TODO: Add GeoHashing logic here to get latitude and longitude from address
        Address address = new Address();
        address.setStreet(addressDto.getStreet());
        address.setCity(addressDto.getCity());
        address.setState(addressDto.getState());
        address.setPinCode(addressDto.getPinCode());
        address.setLatitude(addressDto.getLatitude());
        address.setLongitude(addressDto.getLongitude());
        address.setAddressLine1(addressDto.getAddressLine1());
        address.setUser(user);

        user.getAddresses().add(address);
        addressRepository.save(address);
    }

    public List<AddressDTO> getUserAddresses(UUID userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        List<AddressDTO> addressDTOList = null;
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            addressDTOList = new ArrayList<>();
            for (Address address : user.getAddresses()) {
                AddressDTO addressDTO = new AddressDTO();
                addressDTO.setStreet(address.getStreet());
                addressDTO.setCity(address.getCity());
                addressDTO.setState(address.getState());
                addressDTO.setPinCode(address.getPinCode());
                addressDTO.setLatitude(address.getLatitude());
                addressDTO.setLongitude(address.getLongitude());
                addressDTO.setAddressLine1(address.getAddressLine1());
                addressDTOList.add(addressDTO);
            }
        } else {
            System.out.println("User not found with id: " + userId);
        }
        return addressDTOList;
    }
}
