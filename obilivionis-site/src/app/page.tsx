import Link from "next/link";
import { getVocabList, getVocabStats, getAnimeSeries } from "@/lib/vocabData";

export default async function Home() {
  const vocabList = await getVocabList();
  const stats = await getVocabStats();
  const animeSeries = await getAnimeSeries();
  const topWords = vocabList.slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Oblivionis
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            通过日本动画学习日语词汇 - 沉浸式的语言学习体验
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vocab"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              开始学习
            </Link>
            <Link
              href="/search"
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              搜索词汇
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalWords}</div>
            <div className="text-gray-600 dark:text-gray-300">词汇总数</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalSeries}</div>
            <div className="text-gray-600 dark:text-gray-300">动画系列</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stats.totalAnimes}</div>
            <div className="text-gray-600 dark:text-gray-300">动画作品</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">{stats.totalSeasons}</div>
            <div className="text-gray-600 dark:text-gray-300">季度数</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg text-center">
            <div className="text-3xl font-bold text-red-600 mb-2">{stats.totalEpisodes}</div>
            <div className="text-gray-600 dark:text-gray-300">集数</div>
          </div>
        </div>

        {/* Anime Series Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            动画系列
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {animeSeries.map((series) => (
              <Link
                key={series.series}
                href={`/series/${encodeURIComponent(series.series)}`}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 p-6 rounded-lg transition-all duration-200 border border-blue-200 dark:border-blue-700"
              >
                <div className="font-bold text-xl text-gray-900 dark:text-white mb-3">
                  {series.series}
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>动画作品:</span>
                    <span className="font-semibold">{series.animes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>词汇总数:</span>
                    <span className="font-semibold">{series.totalVocabCount}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {series.animes.map(anime => anime.anime).join(', ')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/series"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              浏览所有系列 →
            </Link>
          </div>
        </div>

        {/* Top Words Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            高频词汇预览
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topWords.map((word) => (
              <Link
                key={word.word}
                href={`/vocab/${encodeURIComponent(word.word)}`}
                className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 p-4 rounded-lg transition-colors"
              >
                <div className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                  {word.word}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  出现 {word.count} 次
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  来自: {word.source.series} - {word.source.anime}
                </div>
                {word.level && (
                  <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded inline-block">
                    {word.level}
                  </div>
                )}
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/vocab"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              查看全部词汇 →
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              词汇学习
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              通过动画台词学习日语词汇，了解词频、等级和用法
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              上下文学习
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              在真实的动画对话中理解词汇的使用场景和含义
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎬</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              即将推出
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              时间轴同步和画面展示功能正在开发中
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
