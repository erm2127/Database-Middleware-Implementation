// apps/web-dashboard/src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';

// Define a type for our log objects for better type-safety
type ApiLog = {
  id: string;
  prompt: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  createdAt: string;
  service: string;
  user: {
    telegramId?: string;
    discordId?: string;
  };
  content?: {
    contentUrl?: string;
  };
};

export default function Home() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Fetch data from our Core API Server's new /logs endpoint
        const response = await fetch('http://localhost:4000/logs');
        if (!response.ok) {
          throw new Error('Failed to fetch logs from server');
        }
        const data = await response.json();
        setLogs(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
    // Optional: Refresh logs every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <div className="p-8 text-center">Loading logs...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">API Request Dashboard</h1>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-gray-200 text-left text-gray-600 uppercase text-sm">
              <th className="py-3 px-5">Image</th>
              <th className="py-3 px-5">Prompt</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5">Service</th>
              <th className="py-3 px-5">Time</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-5">
                  {log.content?.contentUrl && (
                    <img src={log.content.contentUrl} alt="Generated" className="w-16 h-16 rounded-md object-cover" />
                  )}
                </td>
                <td className="py-3 px-5 font-mono text-sm">{log.prompt}</td>
                <td className="py-3 px-5">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    log.status === 'SUCCESS' ? 'bg-green-200 text-green-800' :
                    log.status === 'ERROR' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="py-3 px-5">{log.service}</td>
                <td className="py-3 px-5">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}