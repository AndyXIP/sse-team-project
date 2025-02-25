// app/api/daily-question/route.ts

export async function GET(req: Request) {
    try {
      // Extract the 'difficulty' parameter from the request URL query
      const url = new URL(req.url);
      const difficulty = url.searchParams.get('difficulty') || 'easy'; // Default to 'easy' if not provided
  
      const response = await fetch(`https://main-api.click/api/daily-question?difficulty=${difficulty}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch data' }), { status: response.status });
      }
  
      const data = await response.json();
      return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
      console.error('Error fetching data:', error); // Log the error for debugging
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
  }  