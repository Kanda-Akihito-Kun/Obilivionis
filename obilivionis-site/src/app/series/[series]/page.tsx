import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnimeSeries } from "@/lib/vocabData";

interface SeriesDetailPageProps {
  params: Promise<{
    series: string;
  }>;
}

export default async function SeriesDetailPage({ params }: SeriesDetailPageProps) {
  const resolvedParams = await params;
  const decodedSeries = decodeURIComponent(resolvedParams.series);
  const allSeries = await getAnimeSeries();
  const seriesData = allSeries.find(s => s.series === decodedSeries);

  if (!seriesData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link
            href="/series"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← 返回动画系列
          </Link>
        </div>

        {/* 系列信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {seriesData.series}
            </h1>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {seriesData.totalVocabCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                总词汇数
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {seriesData.animes.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                动画作品
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {seriesData.animes.reduce((sum, anime) => sum + anime.seasons.length, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                季度总数
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {seriesData.animes.reduce((sum, anime) => 
                  sum + anime.seasons.reduce((seasonSum, season) => seasonSum + season.episodes.length, 0), 0
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                集数总数
              </div>
            </div>
          </div>
        </div>

        {/* 动画作品列表 */}
        <div className="space-y-6">
          {seriesData.animes.map((anime) => (
            <div
              key={anime.anime}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
            >
              {/* 动画标题 */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {anime.anime}
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {anime.seasons.length} 季 · {anime.totalVocabCount} 个词汇
                </div>
              </div>

              {/* 季度网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {anime.seasons.map((season) => (
                  <div
                    key={season.season}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                  >
                    {/* 季度标题 */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {season.season}
                      </h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {season.totalVocabCount} 词汇
                      </div>
                    </div>

                    {/* 集数按钮 */}
                    <div className="flex flex-wrap gap-2">
                      {season.episodes.map((episode) => (
                        <Link
                          key={episode.episode}
                          href={`/series/${encodeURIComponent(seriesData.series)}/${encodeURIComponent(anime.anime)}/${encodeURIComponent(season.season)}/${encodeURIComponent(episode.episode)}`}
                          className="bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 px-3 py-2 rounded text-sm font-medium transition-colors flex flex-col items-center min-w-[60px]"
                        >
                          <span>{episode.episode}</span>
                          <span className="text-xs opacity-75">
                            {episode.vocabCount}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 快速导航 */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            快速导航
          </h3>
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/vocab?series=${encodeURIComponent(seriesData.series)}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              查看该系列所有词汇
            </Link>
            <Link
              href={`/search?series=${encodeURIComponent(seriesData.series)}`}
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              在该系列中搜索
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// 生成静态路径
export async function generateStaticParams() {
  const series = await getAnimeSeries();
  
  return series.map((s) => ({
    series: encodeURIComponent(s.series),
  }));
}