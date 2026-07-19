import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useSSE } from "../utils/useSSE";

import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';


const RiderDashboard = () => {
  const userId = localStorage.getItem("userId");
  const [riderActive, setRiderActive] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [assignedOrder, setAssignedOrder] = useState({});
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const routeIndexRef = useRef(0);
  const riderAssignedRef = useRef(false);
  const [position, setPosition] = useState({ lat: 53.3498, lng: -6.2603 });


  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  //GET RIDER ASSIGNED STATUS AND ORDER DETAILS
  useEffect(() => {
    axios.get(`http://localhost:8080/restaurant/order/byrider?riderId=${userId}`)
      .then((response) => {
        if (response.data !== null) {
          riderAssignedRef.current = true;
          setRiderActive(true);
          sessionStorage.setItem("isOnline", !riderActive);
          globalThis.dispatchEvent(new Event('riderStatusChanged'));
          setAssignedOrder(response.data);
        }
      });
  }, [userId]);
  const DESTINATION = { longitude: -6.1968278, latitude: 53.3528938 };
  const KAFKA_LOCATION = { longitude: -6.260558, latitude: 53.3473806 };
  useEffect(() => {
    axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${KAFKA_LOCATION.longitude},${KAFKA_LOCATION.latitude};${DESTINATION.longitude},${DESTINATION.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`)
      .then(({ data }) => { setRouteCoordinates(data.routes[0]?.geometry.coordinates);setRouteGeometry(data.routes[0]?.geometry) })
      .catch(err => console.error("Error fetching directions:", err));
  }, []);
  //WEBSOCKET CONNECTION and RIDER LOCATION DRIFT
  const wsRef = useRef(null);
  useEffect(() => {
    if (!riderActive) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    wsRef.current = new WebSocket("ws://localhost:8080/ws/rider-location");

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");

      const interval = setInterval(() => {
        if (!routeCoordinates || routeIndexRef.current >= routeCoordinates.length) {
          clearInterval(interval);
          return;
        }

        const [lng, lat] = routeCoordinates[routeIndexRef.current]; // read current index every tick
        console.log(lat, lng);

        wsRef.current.send(JSON.stringify({
          riderId: userId,
          latitude: lat,
          longitude: lng
        }));

        setPosition({ lat, lng });
        if (riderAssignedRef.current) {
          routeIndexRef.current += 1;
        }
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
    if (notification !== null && riderActive && !riderAssignedRef.current) {
      setPopupVisible(true);
    }

  }, [notification]);
  //ACTION HANDLERS
  const handleAccept = () => {
    axios.post(`http://localhost:8080/rider/accept?orderId=${notification?.orderId}&riderId=${userId}`)
      .then((response) => {
        riderAssignedRef.current = true;
        setAssignedOrder(notification?.orderDetails);
        setPopupVisible(false);
      })
  }
  const handleDecline = () => {
    axios.post(`http://localhost:8080/rider/reject?orderId=${notification?.orderId}&riderId=${userId}`)
      .then((response) => {
        riderAssignedRef.current = false;
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
    <div >
      {popupVisible && popUp()}
      {riderAssignedRef.current ? (
        <div className="p-6 min-h-[90vh] flex gap-6 items-center justify-center">
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
                    riderAssignedRef.current = false;
                    setAssignedOrder(null);
                  });
              }}
              className="w-full py-2.5 rounded-lg bg-[#CF2101] text-white text-sm font-medium hover:opacity-85 transition-opacity">
              Mark as Delivered
            </button>
          </div>
          <div className="w-full h-[400px] rounded-xl">
            <Map
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{
                longitude: KAFKA_LOCATION.longitude,
                latitude: KAFKA_LOCATION.latitude,
                zoom: 13
              }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
            >


              {position && (
                <Marker longitude={position.lng} latitude={position.lat} anchor="bottom">
                  <img src={"favicon.ico"} width="30" height="30" alt="Rider" />
                </Marker>
              )}

              {routeGeometry && (
                <Source id="route" type="geojson" data={{ type: "Feature", geometry: routeGeometry }}>
                  <Layer
                    id="route-line"
                    type="line"
                    layout={{ "line-join": "round", "line-cap": "round" }}
                    paint={{
                      "line-color": "#f7d707",
                      "line-width": 9,
                      "line-opacity": 0.8,
                    }}
                  />
                </Source>
              )}
            </Map>
          </div>
        </div>
      ) : (
        <div className="p-6 min-h-[90vh] flex flex-col items-center justify-center gap-4">

          {riderActive ? (
            <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-green-900 animate-pulse" />
              </div>
              <p className="text-gray-900 font-medium mb-1">You're online</p>
              <p className="text-sm text-gray-400 mb-6">Waiting for a nearby order to come in</p>
              <button
                onClick={() => { sessionStorage.setItem("isOnline", "false"); globalThis.dispatchEvent(new Event('riderStatusChanged')); setRiderActive(false); }}
                className="px-5 py-2.5 rounded-lg border cursor-pointer border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                Go offline
              </button>
            </div>
          ) : (
            <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
              </div>
              <p className="text-gray-900 font-medium mb-1">You're offline</p>
              <p className="text-sm text-gray-400 mb-6">Go online to start receiving orders</p>
              <button
                onClick={() => { sessionStorage.setItem("isOnline", "true"); globalThis.dispatchEvent(new Event('riderStatusChanged')); setRiderActive(true); }}
                className="px-5 py-2.5 rounded-lg bg-[#CF2101] cursor-pointer text-white text-sm font-medium hover:opacity-90 transition-opacity">
                Go online
              </button>
            </div>
          )}
        </div>
      )}
    </div>)

}
export default RiderDashboard;