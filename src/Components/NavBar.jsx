import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const NavBar = () => {
    const [cartCount, setCartCount] = useState(0);
    const [riderStatus, setRiderStatus] = useState(false);
    const role = localStorage.getItem("role");
    const navigate = useNavigate();

    useEffect(() => {
        if (role && role !== "customer") return;
        const syncCart = () => {
            const cart = JSON.parse(sessionStorage.getItem('cart')) || [];
            let count = 0;
            cart.map(item => { count += item.quantity; });
            setCartCount(count);
        };
        syncCart();
        globalThis.addEventListener('cartUpdated', syncCart);
        return () => globalThis.removeEventListener('cartUpdated', syncCart);
    }, []);

    useEffect(() => {
        if (role && role !== "rider") return;
        const handleRiderStatusChanged = () => {
            setRiderStatus(sessionStorage.getItem("isOnline") === "true");
        };
        globalThis.addEventListener('riderStatusChanged', handleRiderStatusChanged);
        return () => globalThis.removeEventListener('riderStatusChanged', handleRiderStatusChanged);
    }, [riderStatus]);

    return (
        <div className="sticky top-0 z-40 w-full h-16 px-6 flex items-center justify-between
            bg-[#fefae0]/80 backdrop-blur-md border-b border-[#CF2101] shadow-sm">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
                <img src="favicon.ico" alt="Favicon" className="h-8 w-8" />
                <span className="text-lg font-semibold text-gray-900 tracking-tight">
                    Pizza <span className="text-[#CF2101]">Kafka</span>
                </span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">

                {role === "customer" && (
                    <button
                        onClick={() => navigate('/cart')}
                        className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg
                            text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer">
                        <i className="fa-solid fa-cart-shopping text-sm" aria-hidden="true" />
                        <span>Cart</span>
                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[#CF2101] text-white text-[10px]
                                font-semibold rounded-full w-4.5 h-4.5 flex items-center justify-center
                                min-w-[18px] px-1">
                                {cartCount}
                            </span>
                        )}
                    </button>
                )}

                {role === "restaurant" && (
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full
    bg-orange-50 border border-orange-200">
                        <i className="fa-solid fa-fire text-orange-600 text-xs animate-pulse" aria-hidden="true" />
                        <span className="text-xs font-medium text-orange-800">Oven's fired up</span>
                    </div>
                )}

                {role === "rider" && (
                    <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border
                        ${riderStatus
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${riderStatus ? "bg-green-800 animate-pulse" : "bg-gray-400"}`} />
                        <span className="text-xs font-medium">
                            {riderStatus ? "Online" : "Offline"}
                        </span>
                    </div>
                )}

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <button
                    onClick={() => {
                        localStorage.removeItem("role");
                        localStorage.removeItem("userId");
                        sessionStorage.clear();
                        navigate('/');
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-gray-500 cursor-pointer
                        text-sm font-medium hover:bg-gray-50 hover:text-[#CF2101] transition-colors">
                    <i className="fa-solid fa-right-from-bracket text-sm" aria-hidden="true" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default NavBar;