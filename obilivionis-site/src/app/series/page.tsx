import Link from "next/link";
import { getAnimeSeries } from "@/lib/vocabData";

export default async function SeriesPage() {
  const animeSeries = await getAnimeSeries();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            动画系列
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            浏览所有收录的动画系列，按系列 - 作品 - 季度 - 集数的层级组织
          </p>
        </div>

        <div className="space-y-8">
          {animeSeries.map((series) => (
            <div
              key={series.series}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
            >
              {/* 系列标题 */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {series.series}
                </h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {series.animes.length} 部作品 · {series.totalVocabCount} 个词汇
                </div>
              </div>

              {/* 动画作品列表 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {series.animes.map((anime) => (
                  <div
                    key={anime.anime}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                  >
                    {/* 动画标题 */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {anime.anime}
                      </h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {anime.seasons.length} 季 · {anime.totalVocabCount} 词汇
                      </div>
                    </div>

                    {/* 季度列表 */}
                    <div className="space-y-3">
                      {anime.seasons.map((season) => (
                        <div
                          key={season.season}
                          className="bg-white dark:bg-gray-600 rounded p-3"
                        >
                          {/* 季度标题 */}
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {season.season}
                            </h4>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {season.episodes.length} 集 · {season.totalVocabCount} 词汇
                            </div>
                          </div>

                          {/* 集数列表 */}
                          <div className="flex flex-wrap gap-2">
                            {season.episodes.map((episode) => (
                              <Link
                                key={episode.episode}
                                href={`/series/${encodeURIComponent(series.series)}/${encodeURIComponent(anime.anime)}/${encodeURIComponent(season.season)}/${encodeURIComponent(episode.episode)}`}
                                className="bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 px-3 py-1 rounded text-sm font-medium transition-colors"
                                title={`${episode.vocabCount} 个词汇`}
                              >
                                {episode.episode}
                                <span className="ml-1 text-xs opacity-75">
                                  ({episode.vocabCount})
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
            </div>
          ))}
        </div>

        {animeSeries.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              暂无动画系列数据
            </div>
            <p className="text-gray-400 dark:text-gray-500 mt-2">
              请确保 data 目录中包含正确格式的动画数据
            </p>
          </div>
        )}
      </div>
    </div>
  );
}