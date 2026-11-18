package com.kafka.learn.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AddressDTO {
    private UUID userId;
    private String addressLine1;
    private String street;
    private String city;
    private String state;
    private int pinCode;
    private double latitude;
    private double longitude;
}
