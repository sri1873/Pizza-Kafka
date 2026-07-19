import { useEffect, useState, } from "react";
import { useNavigate } from "react-router-dom";
import Cart from "../Components/Cart";
import Checkout from "../Components/Checkout";

const CartPage = () => {
    const [cart, setCart] = useState([]);
    const navigate = useNavigate();
    useEffect(() => {
        const syncCart = () => {
            const cart = JSON.parse(sessionStorage.getItem('cart')) || [];
            setCart(cart);
        };

        syncCart();
        globalThis.addEventListener('cartUpdated', syncCart);
        return () => globalThis.removeEventListener('cartUpdated', syncCart);
    }, []);
    return (
        cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-screen text-center px-4">
                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                    <i className="fa-solid fa-cart-shopping text-2xl text-gray-500" aria-hidden="true" />
                </div>
                <p className="text-gray-900 font-medium mb-1">Your cart is empty</p>
                <p className="text-sm text-gray-600 mb-6">Add items to see them here</p>
                <button
                    onClick={() => navigate('/home')}
                    className="cursor-pointer px-5 py-2.5 rounded-lg bg-[#CF2101] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                    Browse Menu
                </button>
            </div>
        ) : (
            <div className="cart-page p-8 flex flex-row gap-4 justify-between items-start h-screen">
                <Cart cart={cart} setCart={setCart} />
                <Checkout cart={cart} />
            </div>
        ));
}
export default CartPage;