package com.kafka.learn.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class OrderDetailsRequestDTO {
    private UUID userId;
    private List<ItemRequestDTO> orderItems;
    private String destination;
    private String deliveryAddress;
}
