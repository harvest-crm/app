"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { WeekBucket } from "@/app/actions/analytics";

export function ActivityChart({ data }: { data: WeekBucket[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm italic" style={{ color: "#3D5775" }}>
        No activity logged in this period.
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 11, fill: "#3D5775" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#3D5775" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          domain={[0, maxCount]}
        />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E8DFC8",
            borderRadius: 8,
            fontSize: 12,
            color: "#0F2540",
          }}
          formatter={(value) => [value, "Activities"]}
          labelStyle={{ color: "#3D5775" }}
          cursor={{ fill: "#E2F0EE" }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell
              key={idx}
              fill={entry.count === 0 ? "#E8DFC8" : "#1F8A8A"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
