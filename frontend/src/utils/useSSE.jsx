// hooks/useSSE.js
import { useEffect, useState } from "react";

export function useSSE(userId, url) {
    const [notification, setNotification] = useState(null);
    useEffect(() => {
        if (!userId) return;

        const es = new EventSource(
            `${url}/${userId}`
        );

        es.addEventListener("order-update", (e) => {
            setNotification(JSON.parse(e.data));
        });

        return () => es.close();
    }, [userId]);

    return notification;
}