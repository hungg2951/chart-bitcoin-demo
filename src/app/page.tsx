"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  createChart,
  IChartApi,
  UTCTimestamp,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import { cryptoCoins, GetCandles } from "@/api/bitcoin";
import LoadingSpinner from "@/components/loading";

const timeFrame = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "12h",
  "1d",
  "3d",
  "1w",
];

// Hàm fetch dữ liệu từ API dựa trên loại tiền mã hóa và khung thời gian
const fetcher = async (timeframe: string, crypto: string) => {
  const data = await GetCandles(timeframe, crypto);
  return data.map((d) => ({
    time: (d.openTime / 1000) as UTCTimestamp,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
  }));
};

export default function Home() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const volumeChartContainerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [crypto, setCrypto] = useState<string>("BTCUSDT");

  // Lấy dữ liệu từ API với loại tiền và khung thời gian
  const { data, isLoading, error } = useSWR(
    [timeframe, crypto],
    ([timeframe, crypto]) => fetcher(timeframe, crypto),
    {
      refreshInterval: 60000,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  useEffect(() => {
    if (!data || !chartContainerRef.current || !volumeChartContainerRef.current)
      return;

    const commonOptions = {
      layout: {
        background: { color: theme === "dark" ? "#1e1e1e" : "#ffffff" },
        textColor: theme === "dark" ? "#ffffff" : "#000000",
      },
      grid: {
        vertLines: { color: theme === "dark" ? "#444" : "#ddd" },
        horzLines: { color: theme === "dark" ? "#444" : "#ddd" },
      },
    };

    const chart: IChartApi = createChart(chartContainerRef.current, {
      ...commonOptions,
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries);
    candlestickSeries.setData(data);

    const volumeChart: IChartApi = createChart(
      volumeChartContainerRef.current,
      {
        ...commonOptions,
        width: volumeChartContainerRef.current.clientWidth,
        height: 100,
      }
    );

    const volumeSeries = volumeChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volumeSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close > d.open ? "#26a69a" : "#ef5350",
      }))
    );

    return () => {
      chart.remove();
      volumeChart.remove();
    };
  }, [data, theme]);

  return (
    <div>
      <button className="p-2 bg-amber-600" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        Đổi màu nền
      </button>

      {/* Select to choose cryptocurrency */}
      <select className="border border-black m-2" onChange={(e) => setCrypto(e.target.value)} value={crypto}>
        {cryptoCoins.map((coin) => (
          <option key={coin.cryptoName} value={coin.cryptoName}>
            <img src={coin.cryptoImage} alt="" />
            {coin.cryptoName}
          </option>
        ))}
      </select>

      {/* Select to choose timeframe */}
      <select  className="border border-black" onChange={(e) => setTimeframe(e.target.value)} value={timeframe}>
        {timeFrame.map((tf) => (
          <option key={tf} value={tf}>
            {tf}
          </option>
        ))}
      </select>

      {/* Display chart or loading spinner */}
      {isLoading ? (
        <div className="relative w-full h-full">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div>Error loading data</div>
      ) : (
        <div>
          <div
            ref={chartContainerRef}
            style={{ width: "100%", height: "400px" }}
          />
          <div
            ref={volumeChartContainerRef}
            style={{ width: "100%", height: "100px" }}
          />
        </div>
      )}
    </div>
  );
}
