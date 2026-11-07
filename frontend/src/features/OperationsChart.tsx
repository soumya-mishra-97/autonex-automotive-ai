import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: { name: number; latency: number }[];
  compact: boolean;
}
export default function OperationsChart({ data, compact }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 2, bottom: 0, left: 2 }}>
        <defs>
          <linearGradient
            id={compact ? "latencyCompact" : "latencyFull"}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop stopColor="#a51142" stopOpacity={0.35} />
            <stop offset="1" stopColor="#a51142" stopOpacity={0} />
          </linearGradient>
        </defs>
        {!compact && (
          <>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" />
            <YAxis unit="ms" width={65} />
          </>
        )}
        <Tooltip
          contentStyle={{
            background: "var(--paper)",
            color: "var(--ink)",
            borderColor: "var(--line)",
            fontFamily: '"Times New Roman", serif',
          }}
        />
        <Area
          type="monotone"
          dataKey="latency"
          stroke="#a51142"
          strokeWidth={2}
          fill={`url(#${compact ? "latencyCompact" : "latencyFull"})`}
          dot={{ r: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
