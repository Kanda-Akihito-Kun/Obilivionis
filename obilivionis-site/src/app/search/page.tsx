"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { searchVocab, getAvailableJlptLevels, getAvailableSeries, getAvailableAnimes, getAvailableSeasons } from "@/lib/vocabData";
import { VocabListItem, SearchFilters } from "@/types/vocab";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<VocabListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [availableJlptLevels, setAvailableJlptLevels] = useState<string[]>([]);
  const [availableSeries, setAvailableSeries] = useState<string[]>([]);
  const [availableAnimes, setAvailableAnimes] = useState<string[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jlptLevels, series] = await Promise.all([
          getAvailableJlptLevels(),
          getAvailableSeries()
        ]);
        setAvailableJlptLevels(jlptLevels);
        setAvailableSeries(series);
      } catch (error) {
        console.error('Error loading search data:', error);
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

  // 实时搜索（可选）
  useEffect(() => {
    if (query.trim() && hasSearched) {
      const timeoutId = setTimeout(async () => {
        const searchResults = await searchVocab(query, filters);
        setResults(searchResults);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [query, filters, hasSearched]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载搜索数据中...</p>
        </div>
      </div>
    );
  }

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    // 模拟搜索延迟
    setTimeout(async () => {
      const searchResults = await searchVocab(query, filters);
      setResults(searchResults);
      setIsSearching(false);
    }, 300);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setFilters({});
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              词汇搜索
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              搜索动画中的日语词汇，支持多种筛选条件
            </p>
          </div>

          {/* 搜索区域 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
            {/* 主搜索框 */}
            <div className="mb-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入日语词汇进行搜索..."
                    className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || isSearching}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  {isSearching ? "搜索中..." : "搜索"}
                </button>
              </div>
            </div>

            {/* 高级筛选 */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                高级筛选
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
                        anime: undefined, // 重置动画选择
                        season: undefined // 重置季度选择
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
                        season: undefined // 重置季度选择
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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



                {/* 最小出现次数 */}
                <div>
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
              </div>

              {/* 清除筛选 */}
              <div className="mt-4">
                <button
                  onClick={clearSearch}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                >
                  清除所有筛选条件
                </button>
              </div>
            </div>
          </div>

          {/* 搜索结果 */}
          {hasSearched && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  搜索结果
                </h2>
                <span className="text-gray-600 dark:text-gray-300">
                  找到 {results.length} 个结果
                </span>
              </div>

              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">搜索中...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((vocab) => (
                    <Link
                      key={vocab.word}
                      href={`/vocab/${encodeURIComponent(vocab.word)}`}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
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
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                    没有找到匹配的词汇
                  </div>
                  <p className="text-gray-400 dark:text-gray-500">
                    尝试调整搜索关键词或筛选条件
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 搜索提示 */}
          {!hasSearched && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                💡 搜索提示
              </h3>
              <ul className="text-blue-800 dark:text-blue-200 space-y-2">
                <li>• 可以直接输入日语词汇进行搜索</li>
                <li>• 支持部分匹配，输入词汇的一部分也能找到相关结果</li>
                <li>• 使用高级筛选可以按JLPT等级、词性等条件缩小搜索范围</li>
                <li>• 调整最小出现次数可以筛选出高频或低频词汇</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}