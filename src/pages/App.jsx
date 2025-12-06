import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Users, Building2, Globe, Activity, ChevronDown, Search, AlertCircle } from "lucide-react";

// --- [1] 요약 카드 컴포넌트 ---
const Card = ({ title, value, subValue, icon: Icon, colorClass, isPrice = false }) => (
  <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-100 transition-shadow">
    <div className="flex justify-between items-start mb-2 sm:mb-3">
      <div className="overflow-hidden">
        <p className="text-slate-500 text-xs sm:text-sm font-medium mb-1 truncate">{title}</p>
        <h3
          className={`text-lg sm:text-2xl font-bold ${
            !isPrice && value > 0 ? "text-red-500" : !isPrice && value < 0 ? "text-blue-500" : "text-slate-900"
          }`}
        >
          {!isPrice && value > 0 ? "+" : ""}
          {value ? value.toLocaleString() : 0}
          <span className="text-xs sm:text-sm font-normal text-slate-400 ml-1">{isPrice ? "원" : "주"}</span>
        </h3>
      </div>
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 shrink-0`}>
        <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${colorClass.replace("bg-", "text-")}`} />
      </div>
    </div>
    <div className="text-xs text-slate-400 truncate">
      {isPrice ? "기간 변동: " : "누적: "}
      <span className={subValue > 0 ? "text-red-400" : "text-blue-400"}>
        {subValue > 0 ? "+" : ""}
        {subValue ? subValue.toLocaleString() : 0} {isPrice ? "원" : "주"}
      </span>
    </div>
  </div>
);

// --- [2] 커스텀 툴팁 ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs z-50">
        <p className="font-bold text-slate-700 mb-2 border-b pb-1">{label}</p>

        {payload
          .filter((p) => p.dataKey === "price")
          .map((entry, index) => (
            <div key={`price-${index}`} className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-dashed">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-800" />
                <span className="text-slate-600 font-semibold">주가</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{entry.value.toLocaleString()} 원</span>
            </div>
          ))}

        {payload
          .filter((p) => p.dataKey !== "price")
          .map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-500">{entry.name}</span>
              </div>
              <span className={`font-mono font-medium ${entry.value > 0 ? "text-red-500" : "text-blue-500"}`}>
                {entry.value > 0 ? "+" : ""}
                {(entry.value / 10000).toFixed(0).toLocaleString()} 만 주
              </span>
            </div>
          ))}
      </div>
    );
  }
  return null;
};

// --- [3] 메인 APP 컴포넌트 ---
export default function App() {
  const [timeRange, setTimeRange] = useState(90);
  const [activeTab, setActiveTab] = useState("cumulative");
  const [selectedStockCode, setSelectedStockCode] = useState("005930");
  const [selectedStockName, setSelectedStockName] = useState("삼성전자");
  const [chartData, setChartData] = useState([]);
  const [allStockList, setAllStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 종목 리스트 로드
  useEffect(() => {
    const loadStockList = async () => {
      try {
        const listRes = await fetch("./company_list.json");
        if (listRes.ok) {
          const listData = await listRes.json();
          setAllStockList(listData);
        } else {
          setError("종목 리스트(company_list.json)를 불러오는데 실패했습니다.");
        }
      } catch (e) {
        console.warn(e);
        setError("종목 리스트를 불러오는 중 오류가 발생했습니다.");
      }
    };
    loadStockList();
  }, []);

  // 선택된 종목 데이터 로드
  useEffect(() => {
    if (!selectedStockCode) return;

    const loadChartData = async () => {
      setLoading(true);
      setError(null);
      setChartData([]);
      try {
        const res = await fetch(`/api/stock/${selectedStockCode}`);
        if (res.ok) {
          const data = await res.json();
          setChartData(data);
        } else {
          throw new Error("데이터를 가져오는 데 실패했습니다.");
        }
      } catch (err) {
        console.error("Chart Data Load Error:", err);
        setError(`'${selectedStockName}'의 데이터를 가져올 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.`);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [selectedStockCode, selectedStockName]);

  const filteredData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    return chartData.length > timeRange ? chartData.slice(chartData.length - timeRange) : chartData;
  }, [chartData, timeRange]);

  const filteredStockList = useMemo(() => {
    const list = searchTerm
      ? allStockList.filter(
          (item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.includes(searchTerm)
        )
      : allStockList;
    return list.slice(0, 50);
  }, [searchTerm, allStockList]);

  const latestData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : {};
  const firstData = filteredData.length > 0 ? filteredData[0] : {};
  const hasData = !loading && filteredData.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
                투자자별 매매동향 (실시간)
              </h1>
              <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm md:text-base">
                <span className="font-semibold text-green-600">LIVE</span>- {selectedStockName} ({selectedStockCode})
              </p>
            </div>
            <div className="relative w-full md:w-auto" ref={searchRef}>
              <div
                className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all w-full md:w-72"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder={allStockList.length > 0 ? `종목 검색 (${allStockList.length}개)` : "종목 리스트 로딩 중..."}
                  className="w-full py-2.5 px-2 bg-transparent outline-none text-sm text-slate-700 font-medium placeholder-slate-400"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                />
                <ChevronDown className={`w-4 h-4 text-slate-400 mr-3 shrink-0 transition-transform ${isSearchOpen ? "rotate-180" : ""}`} />
              </div>
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {filteredStockList.length > 0 ? (
                    filteredStockList.map((item) => (
                      <button
                        key={item.code}
                        onClick={() => {
                          setSelectedStockCode(item.code);
                          setSelectedStockName(item.name);
                          setSearchTerm("");
                          setIsSearchOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 flex items-center justify-between border-b border-slate-50 last:border-0 ${
                          selectedStockCode === item.code ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="block text-slate-900 truncate">{item.name}</span>
                          <span className="text-xs text-slate-400">
                            {item.code} | {item.market}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-sm text-slate-400 text-center">
                      {searchTerm ? "검색 결과가 없습니다." : "종목명 입력"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex overflow-x-auto pb-1 gap-1 no-scrollbar">
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
              {[
                { label: "1개월", value: 30 },
                { label: "3개월", value: 90 },
                { label: "6개월", value: 180 },
                { label: "1년", value: 365 },
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    timeRange === range.value ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-center min-h-[400px]">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
             <p className="text-slate-500">'{selectedStockName}' 데이터를 불러오는 중입니다...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        {hasData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <Card
                title="현재 주가"
                value={latestData.price}
                subValue={latestData.price - firstData.price}
                icon={TrendingUp}
                colorClass="text-slate-700 bg-slate-100"
                isPrice={true}
              />
              <Card
                title="개인"
                value={latestData.personal}
                subValue={latestData.cumPersonal}
                icon={Users}
                colorClass="text-orange-600 bg-orange-100"
              />
              <Card
                title="외국인"
                value={latestData.foreigner}
                subValue={latestData.cumForeigner}
                icon={Globe}
                colorClass="text-purple-600 bg-purple-100"
              />
              <Card
                title="기관"
                value={latestData.institution}
                subValue={latestData.cumInstitution}
                icon={Building2}
                colorClass="text-emerald-600 bg-emerald-100"
              />
            </div>
            <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-slate-100 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <h2 className="text-lg md:text-xl font-bold text-slate-800">주가 vs 수급 차트</h2>
                <div className="flex gap-2 bg-slate-50 p-1 rounded-lg self-start">
                  <button
                    onClick={() => setActiveTab("cumulative")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === "cumulative" ? "bg-white text-indigo-700 shadow-sm border border-slate-200" : "text-slate-500"
                    }`}
                  >
                    누적 수량
                  </button>
                  <button
                    onClick={() => setActiveTab("daily")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activeTab === "daily" ? "bg-white text-indigo-700 shadow-sm border border-slate-200" : "text-slate-500"
                    }`}
                  >
                    일별 수량
                  </button>
                </div>
              </div>

              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#94a3b8", fontSize: isMobile ? 10 : 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                      minTickGap={35}
                      tickFormatter={(str) => {
                        const d = new Date(str);
                        return `${d.getMonth() + 1}.${d.getDate()}`;
                      }}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={["auto", "auto"]}
                      tick={{ fill: "#94a3b8", fontSize: isMobile ? 10 : 12 }}
                      tickFormatter={(value) => `${(value / 10000).toFixed(0)}`}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={["auto", "auto"]}
                      tick={{ fill: "#1e293b", fontSize: isMobile ? 10 : 12, fontWeight: 600 }}
                      tickFormatter={(value) => (value / 1000).toFixed(0) + "k"}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: isMobile ? "11px" : "14px" }} />
                    <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="price"
                      name="주가"
                      stroke="#1e293b"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: "#1e293b" }}
                      zIndex={10}
                    />
                    {activeTab === "cumulative" ? (
                      <>
                        <Line yAxisId="left" type="monotone" dataKey="cumPersonal" name="개인" stroke="#f97316" strokeWidth={1.5} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="cumForeigner" name="외국인" stroke="#9333ea" strokeWidth={1.5} dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="cumInstitution" name="기관" stroke="#10b981" strokeWidth={1.5} dot={false} />
                      </>
                    ) : (
                      <>
                        <Bar yAxisId="left" dataKey="personal" name="개인" fill="#f97316" opacity={0.8} radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="left" dataKey="foreigner" name="외국인" fill="#9333ea" opacity={0.8} radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="left" dataKey="institution" name="기관" fill="#10b981" opacity={0.8} radius={[2, 2, 0, 0]} />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
