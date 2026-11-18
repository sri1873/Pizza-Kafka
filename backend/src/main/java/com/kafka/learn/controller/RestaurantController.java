package com.kafka.learn.controller;

import com.kafka.learn.dto.OrderDetailsRequestDTO;
import com.kafka.learn.dto.OrderResponseDTO;
import com.kafka.learn.dto.UpdateOrderStatusDTO;
import com.kafka.learn.service.RestaurantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class RestaurantController {


    @Autowired
    private RestaurantService restaurantService;

    @PutMapping(value = "/restaurant/update/orderstatus", headers = {"content-type=application/json"})
    public void updateOrderStatus(@RequestBody UpdateOrderStatusDTO updateOrderStatusDTO) {
        restaurantService.updateOrderStatus(updateOrderStatusDTO);
    }


    @PostMapping(value = "/restaurant/placeorder", headers = {"content-type=application/json"})
    public void order(@RequestBody OrderDetailsRequestDTO orderDetailsRequestDTO) {
        restaurantService.newOrder(orderDetailsRequestDTO);
    }

    @GetMapping("/restaurant/order/byrider")
    public ResponseEntity<OrderResponseDTO> findByRiderId(@RequestParam UUID riderId) {

        return ResponseEntity.ok(restaurantService.getOrderByRiderId(riderId));

    }

    @GetMapping("/restaurant/order/byuser/current")
    public List<OrderResponseDTO> findCurrentOrders(@RequestParam UUID userId) {

        return restaurantService.getCurrentOrderByUserId(userId);
    }

    @GetMapping("/restaurant/order/byuser/past")
    public List<OrderResponseDTO> findPastOrders(@RequestParam UUID userId) {
        return restaurantService.getPastOrderByUserId(userId);
    }

}
