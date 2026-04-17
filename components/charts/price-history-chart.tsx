"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/utils/format";

type PriceHistoryPoint = {
  priceDate: string;
  marketPrice: number | null;
};

export function PriceHistoryChart({
  data,
  currency,
}: {
  data: PriceHistoryPoint[];
  currency?: string;
}) {
  const chartData = data.map((point) => ({
    date: point.priceDate,
    marketPrice: point.marketPrice,
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0f766e" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#cbd5e1" />
          <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 12 }} />
          <YAxis
            tick={{ fill: "#475569", fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(typeof value === "number" ? value : null, currency)}
          />
          <Tooltip
            formatter={(value) => formatCurrency(typeof value === "number" ? value : null, currency)}
            contentStyle={{
              borderRadius: "16px",
              borderColor: "#cbd5e1",
              backgroundColor: "rgba(255,255,255,0.96)",
            }}
          />
          <Area
            dataKey="marketPrice"
            type="monotone"
            stroke="#0f766e"
            strokeWidth={3}
            fill="url(#priceFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
