import React, { useEffect, useState } from "react";
import { useSSE } from "../utils/useSSE";
import axios from "axios";
import Map, { Marker, GeolocateControl, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const DESTINATION = { longitude: -6.1968278, latitude: 53.3528938 };
const KAFKA_LOCATION = { longitude: -6.260558, latitude: 53.3473806 };

const STATUS_STEPS = ["PLACED", "ORDER_ACCEPTED", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED"];

const statusConfig = {
    PLACED: { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-800 border-blue-200', label: 'Order placed' },
    ORDER_ACCEPTED: { dot: 'bg-amber-400', pill: 'bg-amber-50 text-amber-900 border-amber-300', label: 'Being prepared' },
    READY_FOR_PICKUP: { dot: 'bg-green-500', pill: 'bg-green-50 text-green-800 border-green-200', label: 'Ready for pickup' },
    RIDER_ASSIGNED: { dot: 'bg-purple-500', pill: 'bg-purple-50 text-purple-800 border-purple-200', label: 'Rider assigned' },
    OUT_FOR_DELIVERY: { dot: 'bg-indigo-500', pill: 'bg-indigo-50 text-indigo-800 border-indigo-200', label: 'Out for delivery' },
    DELIVERED: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Delivered' },
    CANCELLED: { dot: 'bg-red-500', pill: 'bg-red-50 text-red-800 border-red-200', label: 'Cancelled' },
};

export default function CustomerDashboard() {
    const userId = localStorage.getItem("userId");

    const [order, setOrder] = useState(null);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [riderPosition, setRiderPosition] = useState(null);

    const notification = useSSE(userId, "http://localhost:8080/customer/events");

    useEffect(() => {
        if (!notification) return;
        setOrder(notification?.orderDetails);
    }, [notification]);

    // poll rider location once a rider is assigned
    useEffect(() => {

        if (order?.rider?.riderId == null || order.status === "DELIVERED") return;
        console.log(order);

        const interval = setInterval(() => {
            axios.get(`http://localhost:8080/rider/getlocation?riderId=${order.rider.riderId}`)
                .then(({ data }) => setRiderPosition({ lat: data.latitude, lng: data.longitude }))
                .catch((e) => { console.error("Error fetching rider location:", e); });
        }, 5000);

        return () => clearInterval(interval);
    }, [order?.rider?.riderId, order?.status]);

    // fetch route once rider position is known
    useEffect(() => {
        axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${KAFKA_LOCATION.longitude},${KAFKA_LOCATION.latitude};${DESTINATION.longitude},${DESTINATION.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`)
            .then(({ data }) => setRouteGeometry(data.routes[0]?.geometry))
            .catch(err => console.error("Error fetching directions:", err));
    }, []);

    const timeAgo = (dateStr) => {
        const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        return `${Math.floor(diff / 3600)} hr ago`;
    };

    if (!order) {
        return (
            <div className="p-6">
                <h1 className="text-xl font-medium mb-1">Your orders</h1>
                <p className="text-sm text-gray-400">No active order</p>
            </div>
        );
    }

    const currentStepIndex = STATUS_STEPS.indexOf(order.status);
    const config = statusConfig[order.status] ?? statusConfig.PLACED;

    return (
        <div className="p-6">
            <h1 className="text-xl font-medium mb-3">Your orders</h1>
            <div className="flex gap-4">
                {/* single order card */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6 max-w-md">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium">Order #{order.orderId?.slice(0, 8)}</span>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium
                        px-2.5 py-1 rounded-full border ${config.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                            {order.status}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        {STATUS_STEPS.slice(0, currentStepIndex + 1).map((status, i) => {
                            const stepConfig = statusConfig[status];
                            const isLast = i === currentStepIndex;

                            return (
                                <div key={status} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <span className={`w-2.5 h-2.5 rounded-full ${stepConfig.dot} shrink-0 mt-1`} />
                                        {!isLast && <span className="w-px flex-1 bg-gray-200 my-1" />}
                                    </div>
                                    <div className={isLast ? "pb-0" : "pb-4"}>
                                        <p className="text-sm text-gray-900 font-medium">{stepConfig.label}</p>
                                        {isLast && order.lastUpdated && (
                                            <p className="text-xs text-gray-400">{timeAgo(order.lastUpdated)}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* map */}
                <div className="w-full h-[450px] rounded-xl">
                    <Map
                        mapboxAccessToken={MAPBOX_TOKEN}
                        initialViewState={{
                            longitude: KAFKA_LOCATION.longitude,
                            latitude: KAFKA_LOCATION.latitude,
                            zoom: 13
                        }}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                    >
                        <NavigationControl />
                        <GeolocateControl />

                        {riderPosition && (
                            <Marker longitude={riderPosition.lng} latitude={riderPosition.lat} anchor="bottom">
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
        </div>
    );
}