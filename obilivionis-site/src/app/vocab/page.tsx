"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getVocabList, getAvailableJlptLevels, getAvailableSeries, getAvailableAnimes, getAvailableSeasons } from "@/lib/vocabData";
import { SearchFilters, VocabListItem } from "@/types/vocab";

export default function VocabPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<"frequency" | "alphabetical">("frequency");
  const [loading, setLoading] = useState(true);
  
  const [allVocab, setAllVocab] = useState<VocabListItem[]>([]);
  const [availableJlptLevels, setAvailableJlptLevels] = useState<string[]>([]);
  const [availableSeries, setAvailableSeries] = useState<string[]>([]);
  const [availableAnimes, setAvailableAnimes] = useState<string[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vocabList, jlptLevels, series] = await Promise.all([
          getVocabList(),
          getAvailableJlptLevels(),
          getAvailableSeries()
        ]);
        setAllVocab(vocabList);
        setAvailableJlptLevels(jlptLevels);
        setAvailableSeries(series);
      } catch (error) {
        console.error('Error loading vocab data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadAnimes = async () => {
      if (filters.series) {
        const animes = await getAvailableAnimes(filters.series);
        setAvailableAnimes(animes);
      } else {
        setAvailableAnimes([]);
      }
    };
    loadAnimes();
  }, [filters.series]);

  useEffect(() => {
    const loadSeasons = async () => {
      if (filters.series && filters.anime) {
        const seasons = await getAvailableSeasons(filters.series, filters.anime);
        setAvailableSeasons(seasons);
      } else {
        setAvailableSeasons([]);
      }
    };
    loadSeasons();
  }, [filters.series, filters.anime]);

  const filteredAndSortedVocab = useMemo(() => {
    if (loading || allVocab.length === 0) {
      return [];
    }
    const filtered = allVocab.filter(item => {
      // 搜索过滤
      const matchesSearch = !searchQuery || 
        item.word.includes(searchQuery) || 
        item.word.toLowerCase().includes(searchQuery.toLowerCase());
      
      // JLPT等级过滤
      const matchesJlpt = !filters.jlptLevel || item.level === filters.jlptLevel;
      
      
      
      // 最小出现次数过滤
      const matchesMinCount = !filters.minEpisodeCount || item.count >= filters.minEpisodeCount;
      
      // 动画系列过滤
      const matchesSeries = !filters.series || item.source.series === filters.series;
      
      // 动画名称过滤
      const matchesAnime = !filters.anime || item.source.anime === filters.anime;
      
      // 季度过滤
      const matchesSeason = !filters.season || item.source.season === filters.season;
      
      return matchesSearch && matchesJlpt && matchesMinCount && matchesSeries && matchesAnime && matchesSeason;
    });

    // 排序
    if (sortBy === "frequency") {
      filtered.sort((a, b) => b.count - a.count);
    } else {
      filtered.sort((a, b) => a.word.localeCompare(b.word));
    }

    return filtered;
  }, [allVocab, searchQuery, filters, sortBy, loading]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载词汇数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            词汇库
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            共收录 {allVocab.length} 个词汇，当前显示 {filteredAndSortedVocab.length} 个
          </p>
        </div>

        {/* 搜索和筛选区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
          {/* 第一行：搜索和排序 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* 搜索框 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                搜索词汇
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="输入日语词汇..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* 排序方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                排序方式
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "frequency" | "alphabetical")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="frequency">按频率排序</option>
                <option value="alphabetical">按字母排序</option>
              </select>
            </div>
          </div>

          {/* 第二行：动画系列筛选 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* 动画系列筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                动画系列
              </label>
              <select
                value={filters.series || ""}
                onChange={(e) => {
                  const newSeries = e.target.value || undefined;
                  setFilters(prev => ({ 
                    ...prev, 
                    series: newSeries,
                    anime: undefined,
                    season: undefined
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">全部系列</option>
                {availableSeries.map(series => (
                  <option key={series} value={series}>{series}</option>
                ))}
              </select>
            </div>

            {/* 动画名称筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                动画名称
              </label>
              <select
                value={filters.anime || ""}
                onChange={(e) => {
                  const newAnime = e.target.value || undefined;
                  setFilters(prev => ({ 
                    ...prev, 
                    anime: newAnime,
                    season: undefined
                  }));
                }}
                disabled={!filters.series}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">全部动画</option>
                {availableAnimes.map(anime => (
                  <option key={anime} value={anime}>{anime}</option>
                ))}
              </select>
            </div>

            {/* 季度筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                季度
              </label>
              <select
                value={filters.season || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, season: e.target.value || undefined }))}
                disabled={!filters.anime}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              >
                <option value="">全部季度</option>
                {availableSeasons.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 第三行：词汇属性筛选 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* JLPT等级筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                JLPT等级
              </label>
              <select
                value={filters.jlptLevel || ""}
                onChange={(e) => setFilters(prev => ({ ...prev, jlptLevel: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">全部等级</option>
                {availableJlptLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* 词性筛选 */}

          </div>

          {/* 最小出现次数滑块 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              最小出现次数: {filters.minEpisodeCount || 1}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={filters.minEpisodeCount || 1}
              onChange={(e) => setFilters(prev => ({ ...prev, minEpisodeCount: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* 清除筛选按钮 */}
          <button
            onClick={clearFilters}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            清除筛选
          </button>
        </div>

        {/* 词汇列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedVocab.map((vocab) => (
            <Link
              key={vocab.word}
              href={`/vocab/${encodeURIComponent(vocab.word)}`}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                {vocab.word}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>出现 {vocab.count} 次</span>
                {vocab.level && (
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                    {vocab.level}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                来自: {vocab.source.series} - {vocab.source.anime}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {vocab.source.season} · {vocab.source.episode}
              </div>
            </Link>
          ))}
        </div>

        {filteredAndSortedVocab.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              没有找到匹配的词汇
            </div>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
            >
              清除筛选条件
            </button>
          </div>
        )}
      </div>
    </div>
  );
}