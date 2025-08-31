import { TrendingUp, PieChart, BarChart3 } from "lucide-react";

export default function ChatStats() {
  const stats = [
    {
      icon: <TrendingUp className="h-8 w-8 text-green-400" />,
      title: "Market Analysis",
      desc: "Real-time insights",
    },
    {
      icon: <PieChart className="h-8 w-8 text-blue-400" />,
      title: "Portfolio Tips",
      desc: "Diversification advice",
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-400" />,
      title: "Risk Assessment",
      desc: "Smart strategies",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((item, i) => (
        <div
          key={i}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex items-center space-x-3"
        >
          {item.icon}
          <div>
            <p className="text-white font-semibold">{item.title}</p>
            <p className="text-gray-300 text-sm">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
