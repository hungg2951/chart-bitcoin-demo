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
import { cryptoCoins, GetCandles, GetCryptoInfo } from "@/api/bitcoin";
import LoadingSpinner from "@/components/loading";
import { timeFrame } from "@/constant/timeframe";
import { useTheme } from "@/context/themeContext";
import { GoSun } from "react-icons/go";
import { MdDarkMode, MdOutlineCancel } from "react-icons/md";
import { IoMenu } from "react-icons/io5";

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
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [crypto, setCrypto] = useState<string>("BTCUSDT");
  const [active, setActive] = useState<string>("");
  const { theme, toggleTheme } = useTheme();

  // Lấy dữ liệu từ API với loại tiền và khung thời gian
  const { data, isLoading, error, mutate } = useSWR(
    [timeframe, crypto],
    ([timeframe, crypto]) => fetcher(timeframe, crypto),
    {
      refreshInterval: 60000,
      revalidateIfStale: true,
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Lấy giá Bitcoin hiện tại
  const fetchCurrentPrice = async () => {
    try {
      const { data } = await GetCryptoInfo(crypto);

      const newData = [
        {
          time: (data.closeTime / 1000) as UTCTimestamp,
          open: parseFloat(data.openPrice),
          high: parseFloat(data.highPrice),
          low: parseFloat(data.lowPrice),
          close: parseFloat(data.lastPrice),
          volume: parseFloat(data.volume),
        },
      ];
      mutate(newData, false);
    } catch (error) {
      console.error("Lỗi khi lấy giá Bitcoin hiện tại:", error);
    }
  };
  // Lấy giá Bitcoin cách đây 1 phút
  const fetchPriceOneMinuteAgo = async () => {
    try {
      const data = await GetCandles("1m", crypto);
      const newData = data.map((d) => ({
        time: (d.openTime / 1000) as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));

      mutate(newData, false);
    } catch (error) {
      console.error("Lỗi khi lấy giá Bitcoin cách đây 1 phút:", error);
    }
  };
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
    // set data cho biểu đồ nến
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
    // set data cho biểu đồ khối lượng giao dịch
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
  const onHanleMenu = () => {
    setActive(active == "active" ? "" : "active");
  };
  return (
    <div className="wrapper">
      <div className="btn__mobile">
        <div onClick={toggleTheme}>
          {theme === "light" ? <GoSun /> : <MdDarkMode />}
        </div>
        <div className="toggle___menu" onClick={() => onHanleMenu()}>
          {active == "active" ? <MdOutlineCancel /> : <IoMenu />}
        </div>
      </div>
      <div className={`header ${active}`}>
        {/* Select to choose cryptocurrency */}
        <div className="select">
          <select onChange={(e) => {
            onHanleMenu();
            setCrypto(e.target.value)
          }} value={crypto}>
            {cryptoCoins.map((coin) => (
              <option key={coin.cryptoName} value={coin.cryptoName}>
                {coin.cryptoName}
              </option>
            ))}
          </select>
        </div>

        {/* Select to choose timeframe */}
        <div className="select">
          <select
            onChange={(e) => {
              onHanleMenu();
              setTimeframe(e.target.value);
            }}
            value={timeframe}
          >
            {timeFrame.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => {
          onHanleMenu();
          fetchCurrentPrice()
        }}>
          Giá {crypto} hiện tại
        </button>
        <button onClick={() => {
          onHanleMenu();
          fetchPriceOneMinuteAgo()
        }}>
          Giá {crypto} 1p trước
        </button>
        <button onClick={toggleTheme} className="toggle__theme">
          {theme === "light" ? <GoSun /> : <MdDarkMode />}
        </button>
      </div>
      {isLoading ? (
        <div className="relative w-full min-h-[500px]">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div>Error loading data</div>
      ) : (
        <div>
          <div className="candlestick__chart" ref={chartContainerRef} />
          <div className="volume__chart" ref={volumeChartContainerRef} />
        </div>
      )}
    </div>
  );
}
