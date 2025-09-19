const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST() {
  try {
    if (!HEYGEN_API_KEY) {
      throw new Error("API key is missing from .env");
    }
    
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL environment variable is not configured. Please set it in your .env.local file.");
    }
   

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
  
      if (!response.ok) {
        throw new Error("Failed to get response from backend");
      }

    const data = await response.json();

    return new Response(data.data.token, {
      status: 200,
    });
  } catch (error) {
    console.error("Error retrieving access token:", error);

    return new Response("Failed to retrieve access token", {
      status: 500,
    });
  }
}
