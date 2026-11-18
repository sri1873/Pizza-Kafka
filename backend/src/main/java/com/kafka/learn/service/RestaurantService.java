package com.kafka.learn.service;

import com.kafka.learn.dto.OrderDetailsRequestDTO;
import com.kafka.learn.dto.OrderResponseDTO;
import com.kafka.learn.dto.OrderStatus;
import com.kafka.learn.dto.UpdateOrderStatusDTO;
import com.kafka.learn.entities.OrderDetails;
import com.kafka.learn.entities.OrderItem;
import com.kafka.learn.entities.User;
import com.kafka.learn.repositories.ItemRepository;
import com.kafka.learn.repositories.RestaurantRepository;
import com.kafka.learn.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class RestaurantService {
    //    TODO
    //      Restaurent recieves order and accepts or rejects.
    //      Payment received from rider and confirms order to rider.

    private final UUID restaurantId = UUID.fromString("f3e1c2d4-5b6a-7c8d-9e0f-1a2b3c4d5e6f");
    @Autowired
    private KafkaTemplate<String, OrderDetails> kafkaTemplate;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RestaurantRepository restaurantRepository;
    @Autowired
    private ItemRepository itemRepository;

    public void newOrder(OrderDetailsRequestDTO orderDetailsRequestDTO) {
        Optional<User> byId = userRepository.findById(orderDetailsRequestDTO.getUserId());
        OrderDetails orderDetails = OrderDetails.builder().status(OrderStatus.PLACED).user(byId.get()).build();
        List<OrderItem> orderItems = new ArrayList<>();
        orderDetailsRequestDTO.getOrderItems().forEach(item -> {
            OrderItem orderItem = OrderItem.builder()
                    .item(itemRepository.findById(item.getItemId()).get())
                    .quantity(item.getQuantity())
                    .order(orderDetails)
                    .build();
            orderItems.add(orderItem);
        });
        orderDetails.setOrderItems(orderItems);


        restaurantRepository.save(orderDetails);
//        kafkaTemplate.send("order_info", orderDetails.getOrderId().toString(), orderDetails);
//        notificationService.sendNotification(restaurantId, Notification.builder().orderId(orderDetails.getOrderId()).orderDetails(orderDetails)
//                .message("New Order Placed").build());

    }

    public void updateOrderStatus(UpdateOrderStatusDTO updateOrderStatusDTO) {
        restaurantRepository.findByOrderIdAndUserId(updateOrderStatusDTO.getOrderId(), updateOrderStatusDTO.getUserId())
                .ifPresent(order -> {
                    order.setStatus(OrderStatus.valueOf(updateOrderStatusDTO.getStatus()));
                    order.setLastUpdated(Instant.now());
                    restaurantRepository.save(order);
                    kafkaTemplate.send("order_info", order.getOrderId().toString(), order);
                });
    }


    public OrderResponseDTO getOrderByRiderId(UUID riderId) {
        Optional<OrderDetails> byRiderId = restaurantRepository.findByRiderId(riderId);
        if (byRiderId.isPresent()) {
            OrderDetails orderDetails = byRiderId.get();
            return OrderResponseDTO.builder()
                    .orderId(orderDetails.getOrderId())
                    .status(orderDetails.getStatus())
                    .userId(orderDetails.getUser().getUserId())
                    .createdAt(orderDetails.getCreatedAt())
                    .build();
        }
        return null;
    }

    public List<OrderResponseDTO> getCurrentOrderByUserId(UUID userId) {
        List<OrderResponseDTO> orderResponseDTOList = new ArrayList<>();
        List<OrderDetails> byUserIdAndActive = restaurantRepository.findByUserIdAndActive(userId);
        byUserIdAndActive.forEach(orderDetails -> {
            OrderResponseDTO orderResponseDTO = OrderResponseDTO.builder()
                    .orderId(orderDetails.getOrderId())
                    .status(orderDetails.getStatus())
                    .userId(orderDetails.getUser().getUserId())
                    .createdAt(orderDetails.getCreatedAt())
                    .build();
            orderResponseDTOList.add(orderResponseDTO);
        });

        return orderResponseDTOList;
    }

    public List<OrderResponseDTO> getPastOrderByUserId(UUID userId) {
        List<OrderResponseDTO> orderResponseDTOList = new ArrayList<>();
        List<OrderDetails> byUserIdAndInactive = restaurantRepository.findByUserIdAndInactive(userId);
        byUserIdAndInactive.forEach(orderDetails -> {
            OrderResponseDTO orderResponseDTO = OrderResponseDTO.builder()
                    .orderId(orderDetails.getOrderId())
                    .status(orderDetails.getStatus())
                    .userId(orderDetails.getUser().getUserId())
                    .createdAt(orderDetails.getCreatedAt())
                    .build();
            orderResponseDTOList.add(orderResponseDTO);
        });
        return orderResponseDTOList;
    }

}
