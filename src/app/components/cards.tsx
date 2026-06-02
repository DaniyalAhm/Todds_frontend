
import axios from 'axios';


export default function Cards() {

    const handleGetRequest = async (endpoint) => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            // Use axios.get() for GET requests
            const response = await axios.get(`http://localhost:5000/`);
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
