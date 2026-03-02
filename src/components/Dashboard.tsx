import React from "react";
import { useAppContext } from "../AppContext";
import { TrendingUp, DollarSign, ShoppingCart, Target } from "lucide-react";

export const Dashboard: React.FC = () => {
  const { rawData, changes } = useAppContext();

  const totalSpend = rawData.reduce(
    (acc, row) => acc + parseFloat(row.Spend?.replace(",", ".") || "0"),
    0,
  );
  const totalSales = rawData.reduce(
    (acc, row) => acc + parseFloat(row.Sales?.replace(",", ".") || "0"),
    0,
  );
  const totalOrders = rawData.reduce(
    (acc, row) => acc + parseInt(row.Orders || "0", 10),
    0,
  );

  const acos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;

  const stats = [
    {
      title: "Total Spend",
      value: `$${totalSpend.toFixed(2)}`,
      icon: DollarSign,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      title: "Total Sales",
      value: `$${totalSales.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Total Orders",
      value: totalOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "ACOS",
      value: `${acos.toFixed(2)}%`,
      icon: Target,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Dashboard Overview
        </h1>
        <div className="text-sm text-slate-500">
          Data rows loaded:{" "}
          <span className="font-semibold text-slate-900">{rawData.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
            >
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}
              >
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Recent Rule Executions
        </h2>
        {changes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No rules executed yet. Upload a file and run the processor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3 rounded-tl-lg">Entity</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Rule Applied</th>
                  <th className="px-6 py-3">Change</th>
                  <th className="px-6 py-3 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {changes.slice(0, 5).map((change, i) => (
                  <tr
                    key={i}
                    className="bg-white border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {change.entityType}
                    </td>
                    <td
                      className="px-6 py-4 truncate max-w-xs"
                      title={change.name}
                    >
                      {change.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {change.ruleApplied}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {change.oldBid !== change.newBid ? (
                        <span className="flex items-center gap-2">
                          <span className="line-through text-slate-400">
                            ${change.oldBid}
                          </span>
                          <span className="text-emerald-600 font-semibold">
                            ${change.newBid}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {change.oldState !== change.newState ? (
                        <span className="flex items-center gap-2">
                          <span className="line-through text-slate-400 capitalize">
                            {change.oldState}
                          </span>
                          <span
                            className={`font-semibold capitalize ${change.newState === "paused" ? "text-rose-600" : "text-emerald-600"}`}
                          >
                            {change.newState}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 capitalize">
                          {change.newState}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
