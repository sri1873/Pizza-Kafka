import axios from "axios";
import { useEffect, useState } from "react";
import { useSSE } from "../utils/useSSE";

const TABS = { "PLACED": "PLACED", "PREPARING": "ORDER_ACCEPTED", "READY": "READY_FOR_PICKUP", "DELIVERED": "DELIVERED" };
const STATUS_FLOW = { PLACED: "ORDER_ACCEPTED", ORDER_ACCEPTED: "READY_FOR_PICKUP", READY: "DELIVERED" };

const PILL = {
  PLACED: "bg-amber-50 text-amber-900 border-amber-300",
  ORDER_ACCEPTED: "bg-blue-50 text-blue-900 border-blue-200",
  READY_FOR_PICKUP: "bg-green-50 text-green-800 border-green-200",
  DELIVERED: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("PLACED");

  const userId = localStorage.getItem("userId");
  const notification = useSSE(userId, "http://localhost:8080/restaurant/events");

  useEffect(() => {
    if (notification === null) return;
    if (activeTab === "PLACED") {
      setOrders(prev => [notification?.orderDetails, ...prev]);
    }
  }, [notification]);

  useEffect(() => {
    axios.get("http://localhost:8080/restaurant/orders?status=" + TABS[activeTab])
      .then(response => setOrders(response.data))
      .catch(error => console.error("Error fetching orders:", error));
  }, [activeTab]);

  const updateStatus = (orderId) => {
    const order = orders.find(o => o.orderId === orderId);
    const nextStatus = STATUS_FLOW[order.status];

    axios.put("http://localhost:8080/restaurant/update/orderstatus",
      { orderId, userId: order.user.userId, status: nextStatus })
      .then(() => {
        setOrders(prev => prev.filter(o => o.orderId !== orderId));
      })
      .catch(error => console.error("Error updating order status:", error));
  };

  return (
    <div className="p-6 min-h-[90vh]" style={{ backgroundColor: '#f5d04c' }}>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-black/10 mb-6">
        {Object.keys(TABS).map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize cursor-pointer
              ${activeTab === tab
                ? "border-[#CF2101] text-gray-900"
                : "border-transparent text-gray-900/50 hover:text-gray-900/70"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Card wrapper — white surface to separate table from yellow background */}
      {/* Card wrapper */}
      <div className="bg-[#fdf6e3] rounded-xl border border-black/5 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wide bg-black/[0.02] border-b border-black/5">
              <th className="text-center py-3 font-medium">Order</th>
              <th className="text-center py-3 font-medium">Items</th>
              <th className="text-center py-3 font-medium">Time</th>
              <th className="text-center py-3 font-medium">Status</th>
              {activeTab !== "DELIVERED"&& activeTab !== "READY" && (
                <th className="text-center py-3 font-medium">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {orders.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                No {activeTab.toLowerCase()} orders
              </td></tr>
            ) : orders.map(order => (
              <tr key={order.orderId}>
                <td className="py-3 font-medium text-gray-900 text-center">
                  <span className="text-xs text-gray-500">#{order.orderId.slice(0, 8)}</span>
                </td>
                <td className="py-3 text-gray-600 text-center">
                  {order.items.map((item, i) => (
                    <div key={item.item} className={i > 0 ? "text-xs text-gray-400" : ""}>
                      {item.item} x{item.quantity}
                    </div>
                  ))}
                </td>
                <td className="py-3 text-gray-400 text-center whitespace-nowrap">
                  {new Date(order.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-3 text-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${PILL[order.status]}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {order.status}
                  </span>
                </td>
                {activeTab !== "DELIVERED" && (
                  <td className="py-3 text-center">
                    {activeTab === "PLACED" && (
                      <button onClick={() => updateStatus(order.orderId)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#CF2101] text-white hover:opacity-85 transition-opacity cursor-pointer">
                        Accept
                      </button>
                    )}
                    {activeTab === "PREPARING" && (
                      <button onClick={() => updateStatus(order.orderId)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-green-300 text-green-800 hover:bg-green-100 transition-colors cursor-pointer">
                        Mark READY
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}