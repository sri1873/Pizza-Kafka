import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useSSE } from "../utils/useSSE";

const RiderDashboard = () => {
  const userId = localStorage.getItem("userId");
  const [riderAssigned, setRiderAssigned] = useState(false);
  const [riderActive, setRiderActive] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [assignedOrder, setAssignedOrder] = useState({});
  //GET RIDER ASSIGNED STATUS AND ORDER DETAILS
  useEffect(() => {
    axios.get(`http://localhost:8080/restaurant/order/byrider?riderId=${userId}`)
      .then((response) => {
        if (response.data !== null) {
          setRiderAssigned(true);
          setAssignedOrder(response.data);
        }
      });
  }, [userId]);
  //WEBSOCKET CONNECTION and RIDER LOCATION DRIFT
  const wsRef = useRef(null);
  const drift = useRef({
    lat: (Math.random() - 0.5) * 0.0005,
    lng: (Math.random() - 0.5) * 0.0005,
  });
  useEffect(() => {
    if (!riderActive) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    wsRef.current = new WebSocket("ws://localhost:8080/ws/rider-location");
    wsRef.current.onopen = () => {
      console.log("WebSocket connected");

      let lat = 53.3498;
      let lng = -6.2603;

      // start interval only after connection is open
      const interval = setInterval(() => {
        lat += drift.current.lat + (Math.random() - 0.5) * 0.0002;
        lng += drift.current.lng + (Math.random() - 0.5) * 0.0002;

        wsRef.current.send(JSON.stringify({
          riderId: userId,
          latitude: lat,
          longitude: lng
        }));
      }, 5000);


      wsRef.current.intervalId = interval;
    };

    wsRef.current.onerror = (e) => console.error("WebSocket error:", e);

    return () => {
      clearInterval(wsRef.current?.intervalId);
      wsRef.current?.close();
    };
  }, [riderActive]);
  //POP-UP TIMER & POP-UP VISIBILITY
  const [countdown, setCountdown] = useState(10);
  useEffect(() => {
    if (!popupVisible) {
      setCountdown(10);
      return;
    }
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          setPopupVisible(false);
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [popupVisible]);
  //SSE NOTIFICATION for new order assignment

  const notification = useSSE(userId, "http://localhost:8080/rider/events");

  useEffect(() => {
    if (notification?.length > 0 && riderActive && !riderAssigned) {
      setPopupVisible(true);
    }

  }, [notification]);
  //ACTION HANDLERS
  const handleAccept = () => {
    axios.post(`http://localhost:8080/rider/accept?orderId=${notification[0]?.orderId}&riderId=${userId}`)
      .then((response) => {
        setRiderAssigned(true);
        setAssignedOrder(notification[0]?.orderDetails);
        setPopupVisible(false);
      })
  }
  const handleDecline = () => {
    axios.post(`http://localhost:8080/rider/reject?orderId=${notification[0]?.orderId}&riderId=${userId}`)
      .then((response) => {
        setRiderAssigned(false);
        setPopupVisible(false);
      })
  }
  //POP-UP COMPONENT
  const popUp = () => (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-80 shadow-xl">

        {/* countdown ring */}
        <div className="flex justify-center mb-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke="#e5e7eb" strokeWidth="2" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke="#CF2101" strokeWidth="2"
                strokeDasharray="100"
                strokeDashoffset={100 - (countdown / 10) * 100}
                className="transition-all duration-1000" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
              {countdown}s
            </span>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-center mb-1">New Order</h2>

        <div className="flex gap-3">
          <button onClick={handleDecline}
            className="flex-1 py-2 cursor-pointer rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Decline
          </button>
          <button onClick={handleAccept}
            className="flex-1 py-2 cursor-pointer rounded-lg bg-[#CF2101] text-white text-sm font-medium hover:opacity-85">
            Accept
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 min-h-[90vh] flex flex-col items-center justify-center">
      <button
        onClick={() => setRiderActive(prev => !prev)}
        className={`px-4 py-2 rounded-lg text-white text-sm ${riderActive ? "bg-red-500" : "bg-green-500"}`}>
        {riderActive ? "Go Offline" : "Go Online"}
      </button>
      {popupVisible && popUp()}
      {riderAssigned ? (
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Active Order</h2>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              {assignedOrder.status}
            </span>
          </div>

          {/* Pickup */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pickup from</p>
            <p className="text-sm font-medium">Pizza Kafka</p>
            <p className="text-xs text-gray-400">123 Main Street, Crescent</p>
          </div>

          {/* Deliver to */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Deliver to</p>
            <p className="text-sm font-medium">{assignedOrder.user?.name}</p>
            <p className="text-xs text-gray-400">{assignedOrder.user?.address}</p>
          </div>

          {/* Items */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Items</p>
            <div className="space-y-1">
              {assignedOrder.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.item}</span>
                  <span className="text-gray-400">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <button
            onClick={() => {
              axios.post(`http://localhost:8080/rider/deliver?orderId=${assignedOrder.orderId}&riderId=${userId}`)
                .then(() => {
                  setRiderAssigned(false);
                  setAssignedOrder(null);
                });
            }}
            className="w-full py-2.5 rounded-lg bg-[#CF2101] text-white text-sm font-medium hover:opacity-85 transition-opacity">
            Mark as Delivered
          </button>
        </div>
      ) : (
        <div className="no-order w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          No orders assigned to you yet. Please wait for the restaurant to assign an order.
        </div>
      )}
    </div>)
}
export default RiderDashboard;