import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnimeSeries } from "@/lib/vocabData";

interface AnimeDetailPageProps {
  params: Promise<{
    series: string;
    anime: string;
  }>;
}

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const resolvedParams = await params;
  const decodedSeries = decodeURIComponent(resolvedParams.series);
  const decodedAnime = decodeURIComponent(resolvedParams.anime);
  const allSeries = await getAnimeSeries();
  const seriesData = allSeries.find(s => s.series === decodedSeries);
  const animeData = seriesData?.animes.find(a => a.anime === decodedAnime);

  if (!seriesData || !animeData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 面包屑导航 */}
        <nav className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
              首页
            </Link>
            <span>/</span>
            <Link href="/series" className="hover:text-blue-600 dark:hover:text-blue-400">
              动画系列
            </Link>
            <span>/</span>
            <Link 
              href={`/series/${encodeURIComponent(seriesData.series)}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {seriesData.series}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">{animeData.anime}</span>
          </div>
        </nav>

        {/* 动画详情 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {animeData.anime}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              来自系列: {seriesData.series}
            </p>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {animeData.seasons.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">季度数</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {animeData.seasons.reduce((total, season) => total + season.episodes.length, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">总集数</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {animeData.totalVocabCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">词汇总数</div>
            </div>
          </div>

          {/* 季度列表 */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              季度列表
            </h2>
            {animeData.seasons.map((season) => (
              <div
                key={season.season}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {season.season}
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {season.episodes.length} 集 • {season.totalVocabCount} 个词汇
                  </div>
                </div>
                
                {/* 集数网格 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {season.episodes.map((episode) => (
                    <Link
                      key={episode.episode}
                      href={`/series/${encodeURIComponent(seriesData.series)}/${encodeURIComponent(animeData.anime)}/${encodeURIComponent(season.season)}/${encodeURIComponent(episode.episode)}`}
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

          {/* 快速导航 */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              快速导航
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/vocab?series=${encodeURIComponent(seriesData.series)}&anime=${encodeURIComponent(animeData.anime)}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                查看该动画所有词汇
              </Link>
              <Link
                href={`/search?series=${encodeURIComponent(seriesData.series)}&anime=${encodeURIComponent(animeData.anime)}`}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                在该动画中搜索
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 生成静态路径
export async function generateStaticParams() {
  const allSeries = await getAnimeSeries();
  const paths: { series: string; anime: string }[] = [];
  
  allSeries.forEach(series => {
    series.animes.forEach(anime => {
      paths.push({
        series: series.series,
        anime: anime.anime
      });
    });
  });
  
  return paths;
}