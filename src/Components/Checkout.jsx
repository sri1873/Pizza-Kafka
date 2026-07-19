import axios from "axios";
import { useNavigate } from "react-router-dom";

const Checkout = ({ cart }) => {

    const navigate = useNavigate();
    const placeOrder = (cart) => {
        const orderDetails = {
            userId: localStorage.getItem("userId"),
            de̥sitinati̥on: "",
            deliveryAddress: "",
            items: cart.map(item => ({
                item: item.name,
                quantity: item.quantity
            }))
        };
        axios.post('http://localhost:8080/restaurant/placeorder', orderDetails).then(response => {
            console.log("Order placed successfully:", response.data);
            sessionStorage.removeItem('cart');
            globalThis.dispatchEvent(new Event('cartUpdated'));
            navigate('/order-status');
        }).catch(error => {
            console.error("Error placing order:", error);
        }
        );
    };

    return (
        <div className="checkout p-6 bg-white border border-gray-100 rounded-2xl shadow-sm w-1/3">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>€{cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery fee</span>
                    <span>€0.00</span>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-medium text-gray-900">Total</span>
                <span className="text-xl font-semibold text-gray-900">
                    €{cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}
                </span>
            </div>

            <button
                onClick={(e) => placeOrder(cart)}
                className="w-full py-3 rounded-lg bg-[#CF2101] text-white text-sm font-medium
            hover:bg-[#a71c01] transition-colors">
                Place Order
            </button>
        </div>

    );
}

export default Checkout;