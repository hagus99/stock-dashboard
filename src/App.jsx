import React, { useState, useMemo, useEffect, useRef } from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, Users, Building2, Globe, Activity, ChevronDown, Search, AlertCircle } from "lucide-react";

// --- [1] 요약 카드 컴포넌트 ---
const Card = ({ title, value, subValue, icon: Icon, colorClass, isPrice = false }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3
          className={`text-2xl font-bold ${
            !isPrice && value > 0 ? "text-red-500" : !isPrice && value < 0 ? "text-blue-500" : "text-slate-900"
          }`}
        >
          {!isPrice && value > 0 ? "+" : ""}
          {value ? value.toLocaleString() : 0}
          <span className="text-sm font-normal text-slate-400 ml-1">{isPrice ? "원" : "주"}</span>
        </h3>
      </div>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace("bg-", "text-")}`} />
      </div>
    </div>
    <div className="text-xs text-slate-400">
      {isPrice ? "기간 변동폭: " : "누적 합계: "}
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
      <div className="bg-white p-4 border border-slate-200 shadow-lg rounded-lg text-sm z-50">
        <p className="font-bold text-slate-700 mb-2 border-b pb-1">{label}</p>
        {payload
          .filter((p) => p.dataKey === "price")
          .map((entry, index) => (
            <div key={`price-${index}`} className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-dashed">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-800" />
                <span className="text-slate-600 font-semibold">주가 (Close)</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{entry.value.toLocaleString()} 원</span>
            </div>
          ))}
        {payload
          .filter((p) => p.dataKey !== "price")
          .map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
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

  // 선택된 종목 상태 (기본값: 삼성전자 코드)
  const [selectedStockCode, setSelectedStockCode] = useState("005930");
  const [selectedStockName, setSelectedStockName] = useState("삼성전자");

  const [realDataMap, setRealDataMap] = useState(null); // 차트 데이터
  const [allStockList, setAllStockList] = useState([]); // 전체 종목 리스트 (검색용)

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 검색 UI 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // 외부 클릭 시 검색창 닫기
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 초기 데이터 로드 (company_list.json & stock_data.json)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. 전체 종목 리스트 로드 시도
        try {
          // './'를 붙여서 명시적 상대 경로로 시도 (일부 환경 호환성)
          const listRes = await fetch("./company_list.json");
          if (listRes.ok) {
            const listData = await listRes.json();
            setAllStockList(listData);
          } else {
            console.warn("company_list.json 로드 실패 (404). 파일이 public 폴더에 있는지 확인하세요.");
          }
        } catch (e) {
          console.warn("검색 리스트 로드 중 에러 (무시됨):", e);
          // 검색 리스트가 없어도 차트는 볼 수 있어야 하므로 여기서 멈추지 않음
        }

        // 2. 차트 데이터 로드 시도
        try {
          const dataRes = await fetch("./stock_data.json");
          if (dataRes.ok) {
            const chartData = await dataRes.json();
            setRealDataMap(chartData);
          } else {
            throw new Error("stock_data.json 파일을 찾을 수 없습니다.");
          }
        } catch (e) {
          // 차트 데이터 로드 실패는 치명적임
          throw e;
        }
      } catch (err) {
        console.error("Data Load Error:", err);
        setError("데이터 로드 실패: python 스크립트를 실행하여 데이터 파일(stock_data.json)을 public 폴더에 넣어주세요.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 선택된 종목의 차트 데이터 필터링
  const displayData = useMemo(() => {
    if (realDataMap && realDataMap[selectedStockCode]) {
      return realDataMap[selectedStockCode];
    }
    return []; // 데이터가 없으면 빈 배열 반환
  }, [realDataMap, selectedStockCode]);

  const filteredData = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];
    // 데이터가 timeRange보다 적으면 전체 반환, 많으면 뒤에서부터 자름
    return displayData.length > timeRange ? displayData.slice(displayData.length - timeRange) : displayData;
  }, [displayData, timeRange]);

  // 검색 필터링 로직 (코드 또는 이름 매칭)
  const filteredStockList = useMemo(() => {
    if (!searchTerm) return [];
    return allStockList
      .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.code.includes(searchTerm))
      .slice(0, 50); // 성능을 위해 최대 50개만 표시
  }, [searchTerm, allStockList]);

  // 최신 데이터 포인트
  const latestData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : {};
  const firstData = filteredData.length > 0 ? filteredData[0] : {};

  // 데이터 유무 확인
  const hasData = filteredData.length > 0;

  // 축 스케일 계산
  const minPrice = hasData ? Math.min(...filteredData.map((d) => d.price)) : 0;
  const maxPrice = hasData ? Math.max(...filteredData.map((d) => d.price)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-8 h-8 text-indigo-600" />
              투자자별 매매 & 주가 추이
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-semibold text-green-600">LIVE DATA (Volume)</span>- {selectedStockName} ({selectedStockCode})
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* 종목 검색창 */}
            <div className="relative" ref={searchRef}>
              <div
                className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all w-72"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="w-4 h-4 text-slate-400 ml-3" />
                <input
                  type="text"
                  placeholder={allStockList.length > 0 ? `전체 종목 검색 (${allStockList.length}개)` : "종목 리스트 로딩 중..."}
                  className="w-full py-2.5 px-2 bg-transparent outline-none text-sm text-slate-700 font-medium placeholder-slate-400"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                />
                {isSearchOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 mr-3 rotate-180 transition-transform" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 mr-3 transition-transform" />
                )}
              </div>

              {/* 검색 결과 드롭다운 */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
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
                        <div>
                          <span className="block text-slate-900">{item.name}</span>
                          <span className="text-xs text-slate-400">
                            {item.code} | {item.market}
                          </span>
                        </div>
                        {/* 데이터 보유 여부 표시 (선택적) */}
                        {realDataMap && realDataMap[item.code] ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Data</span>
                        ) : (
                          <span className="text-xs text-slate-300">No Data</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-sm text-slate-400 text-center">
                      {searchTerm ? "검색 결과가 없습니다." : "종목명 또는 코드를 입력하세요."}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 기간 선택 버튼 */}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              {[
                { label: "1개월", value: 30 },
                { label: "3개월", value: 90 },
                { label: "6개월", value: 180 },
                { label: "1년", value: 365 },
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    timeRange === range.value ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm flex items-center gap-2 animate-pulse">
            ⚠️ {error}
          </div>
        )}

        {/* 데이터가 있는 경우: 차트 및 카드 표시 */}
        {hasData ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card
                title="현재 주가"
                value={latestData.price}
                subValue={latestData.price - firstData.price}
                icon={TrendingUp}
                colorClass="text-slate-700 bg-slate-100"
                isPrice={true}
              />
              <Card
                title="개인 (순매수량)"
                value={latestData.personal}
                subValue={latestData.cumPersonal}
                icon={Users}
                colorClass="text-orange-600 bg-orange-100"
              />
              <Card
                title="외국인 (순매수량)"
                value={latestData.foreigner}
                subValue={latestData.cumForeigner}
                icon={Globe}
                colorClass="text-purple-600 bg-purple-100"
              />
              <Card
                title="기관 (순매수량)"
                value={latestData.institution}
                subValue={latestData.cumInstitution}
                icon={Building2}
                colorClass="text-emerald-600 bg-emerald-100"
              />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative min-h-[500px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-indigo-600">{selectedStockName}</span>
                    주가 vs 순매수량 차트
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">검은색 선은 주가(우측), 컬러 막대/선은 순매수 수량(좌측)을 나타냅니다.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("cumulative")}
                    className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                      activeTab === "cumulative"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    누적 수량
                  </button>
                  <button
                    onClick={() => setActiveTab("daily")}
                    className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                      activeTab === "daily"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    일별 수량
                  </button>
                </div>
              </div>

              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                      minTickGap={30}
                    />

                    <YAxis
                      yAxisId="left"
                      domain={["auto", "auto"]}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "순매수 (만 주)", angle: -90, position: "insideLeft", style: { fill: "#94a3b8", fontSize: 12 } }}
                    />

                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={["auto", "auto"]}
                      tick={{ fill: "#1e293b", fontSize: 12, fontWeight: 600 }}
                      tickFormatter={(value) => value.toLocaleString()}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "주가 (원)",
                        angle: 90,
                        position: "insideRight",
                        style: { fill: "#1e293b", fontSize: 12, fontWeight: 600 },
                      }}
                    />

                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: "20px" }} />
                    <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeDasharray="3 3" />

                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="price"
                      name="주가"
                      stroke="#1e293b"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: "#1e293b" }}
                      zIndex={10}
                    />

                    {activeTab === "cumulative" ? (
                      <>
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="cumPersonal"
                          name="개인 누적"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="cumForeigner"
                          name="외국인 누적"
                          stroke="#9333ea"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="cumInstitution"
                          name="기관 누적"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                      </>
                    ) : (
                      <>
                        <Bar yAxisId="left" dataKey="personal" name="개인 순매수" fill="#f97316" opacity={0.8} radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="left" dataKey="foreigner" name="외국인 순매수" fill="#9333ea" opacity={0.8} radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="left" dataKey="institution" name="기관 순매수" fill="#10b981" opacity={0.8} radius={[2, 2, 0, 0]} />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          /* 데이터가 없는 경우 Fallback UI */
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-center min-h-[400px]">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">'{selectedStockName}' 데이터가 없습니다</h3>
            <p className="text-slate-500 max-w-md">
              현재 데모 버전에서는 일부 상위 종목(삼성전자, 하이닉스 등)의 데이터만 수집되어 있습니다.
              <br />
              <br />
              <span className="text-xs bg-slate-100 px-2 py-1 rounded">stock_data_collector.py</span> 파일의
              <code>update_data</code> 함수에 이 종목 코드(<strong>{selectedStockCode}</strong>)를 추가하고 실행하면 차트를 볼 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
