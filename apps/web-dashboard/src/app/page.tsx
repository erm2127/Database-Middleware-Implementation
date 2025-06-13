// apps/web-dashboard/src/app/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface ApiLog {
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
}

interface FilterState {
  status: string;
  service: string;
  search: string;
}

interface SortState {
  field: keyof ApiLog;
  direction: 'asc' | 'desc';
}

// Constants
const POLL_INTERVAL = 10000;
const PAGE_SIZE = 10;

// API Service
const fetchLogs = async (page: number, filters: FilterState) => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: PAGE_SIZE.toString(),
    ...filters,
  });

  const response = await fetch(`http://localhost:4000/logs?${queryParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch logs');
  }
  return response.json() as Promise<{
    data: ApiLog[];
    total: number;
    page: number;
  }>;
};

// Components
const StatusBadge = ({ status }: { status: ApiLog['status'] }) => {
  const styles = {
    SUCCESS: 'bg-green-100 text-green-800',
    ERROR: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex justify-center gap-2 mt-4">
    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        className={`px-3 py-1 rounded ${
          currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200'
        }`}
        aria-current={currentPage === page ? 'page' : undefined}
      >
        {page}
      </button>
    ))}
  </div>
);

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    service: '',
    search: '',
  });
  const [sort, setSort] = useState<SortState>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Debounced search handler
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setFilters((prev) => ({ ...prev, search: value }));
      setPage(1);
    }, 300),
    []
  );

  // Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['logs', page, filters],
    queryFn: () => fetchLogs(page, filters),
    refetchInterval: POLL_INTERVAL,
    staleTime: 5000,
    keepPreviousData: true,
  });

  // Sorting handler
  const handleSort = (field: keyof ApiLog) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sorted and filtered data
  const sortedLogs = useMemo(() => {
    if (!data?.data) return [];
    return [...data.data].sort((a, b) => {
      const multiplier = sort.direction === 'asc' ? 1 : -1;
      if (sort.field === 'createdAt') {
        return multiplier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      return multiplier * String(a[sort.field]).localeCompare(String(b[sort.field]));
    });
  }, [data?.data, sort]);

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1;

  if (error) {
    return (
      <div className="p-8 text-center text-red-500" role="alert">
        Error: {(error as Error).message}
      </div>
    );
  }

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">API Request Dashboard</h1>

      {/* Filters */}
      <div className="mb-4 flex gap-4 flex-wrap">
        <select
          className="p-2 border rounded"
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          value={filters.status}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="ERROR">Error</option>
          <option value="PENDING">Pending</option>
        </select>

        <input
          type="text"
          placeholder="Search prompts..."
          className="p-2 border rounded"
          onChange={(e) => debouncedSetSearch(e.target.value)}
          aria-label="Search logs"
        />

        <select
          className="p-2 border rounded"
          onChange={(e) => setFilters((prev) => ({ ...prev, service: e.target.value }))}
          value={filters.service}
          aria-label="Filter by service"
        >
          <option value="">All Services</option>
          {/* Add dynamic service options based on data */}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal" aria-label="API logs table">
          <thead>
            <tr className="bg-gray-200 text-left text-gray-600 uppercase text-sm">
              <th className="py-3 px-5">Image</th>
              <th className="py-3 px-5 cursor-pointer" onClick={() => handleSort('prompt')}>
                Prompt {sort.field === 'prompt' && (sort.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-3 px-5 cursor-pointer" onClick={() => handleSort('status')}>
                Status {sort.field === 'status' && (sort.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-3 px-5 cursor-pointer" onClick={() => handleSort('service')}>
                Service {sort.field === 'service' && (sort.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-3 px-5 cursor-pointer" onClick={() => handleSort('createdAt')}>
                Time {sort.field === 'createdAt' && (sort.direction === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-3 px-5 text-center">
                  Loading logs...
                </td>
              </tr>
            ) : (
              sortedLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-5">
                    {log.content?.contentUrl && (
                      <Suspense fallback={<div>Loading image...</div>}>
                        <Image
                          src={log.content.contentUrl}
                          alt={`Generated content for ${log.prompt}`}
                          width={64}
                          height={64}
                          className="rounded-md object-cover"
                          loading="lazy"
                        />
                      </Suspense>
                    )}
                  </td>
                  <td className="py-3 px-5 font-mono text-sm">
                    <Link href={`/log/${log.id}`} className="hover:underline">
                      {log.prompt}
                    </Link>
                  </td>
                  <td className="py-3 px-5">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="py-3 px-5">{log.service}</td>
                  <td className="py-3 px-5">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </main>
  );
}
