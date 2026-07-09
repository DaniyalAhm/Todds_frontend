
import { useState } from "react";
import axios from 'axios';
import API_BASE_URL from "@/lib/api";


export default function Cards() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<unknown>(null);

    const handleGetRequest = async (endpoint: string) => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            // Use axios.get() for GET requests
            const response = await axios.get(`${API_BASE_URL}${endpoint}`);
            setData(response.data);
            console.log("✅ GET Success:", response.data);
        } catch (err) {
            setError("Failed to fetch data. Check the endpoint or API status.");
            console.error("❌ GET Error:", err);
        } finally {
            setLoading(false);
        }
    };


  return (
    <div className="max-w-sm overflow-hidden rounded shadow-lg">
    </div>
  );
}
