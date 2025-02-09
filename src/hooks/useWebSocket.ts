import { useState, useEffect } from 'react';
import { createClient } from 'graphql-ws';

export function useWebSocket({ endpoint, query }: { endpoint: string; query: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const client = createClient({
      url: endpoint,
    });

    const unsubscribe = client.subscribe(
      {
        query,
      },
      {
        next: (data) => setData(data),
        error: (error) => console.error('WebSocket error:', error),
        complete: () => console.log('WebSocket subscription completed'),
      },
    );

    return () => {
      unsubscribe();
    };
  }, [endpoint, query]);

  return { data };
}