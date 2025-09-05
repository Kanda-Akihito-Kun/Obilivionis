import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnimeSeries } from "@/lib/vocabData";

interface SeasonDetailPageProps {
  params: {
    series: string;
    anime: string;
    season: string;
  };
}

export default function SeasonDetailPage({ params }: SeasonDetailPageProps) {
  const decodedSeries = decodeURIComponent(params.series);
  const decodedAnime = decodeURIComponent(params.anime);
  const decodedSeason = decodeURIComponent(params.season);
  const allSeries = getAnimeSeries();
  const seriesData = allSeries.find(s => s.series === decodedSeries);
  const animeData = seriesData?.animes.find(a => a.anime === decodedAnime);
  const seasonData = animeData?.seasons.find(s => s.season === decodedSeason);

  if (!seriesData || !animeData || !seasonData) {
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
            <Link 
              href={`/series/${encodeURIComponent(seriesData.series)}/${encodeURIComponent(animeData.anime)}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {animeData.anime}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">{seasonData.season}</span>
          </div>
        </nav>

        {/* 季度详情 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {seasonData.season}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {seriesData.series} - {animeData.anime}
            </p>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {seasonData.episodes.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">总集数</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {seasonData.totalVocabCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">词汇总数</div>
            </div>
          </div>

          {/* 集数列表 */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              集数列表
            </h2>
            
            {/* 集数网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {seasonData.episodes.map((episode) => (
                <Link
                  key={episode.episode}
                  href={`/series/${encodeURIComponent(seriesData.series)}/${encodeURIComponent(animeData.anime)}/${encodeURIComponent(seasonData.season)}/${encodeURIComponent(episode.episode)}`}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 p-4 rounded-lg transition-all duration-200 border border-blue-200 dark:border-blue-700 text-center"
                >
                  <div className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                    {episode.episode}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {episode.vocabCount} 个词汇
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 快速导航 */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              快速导航
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/vocab?series=${encodeURIComponent(seriesData.series)}&anime=${encodeURIComponent(animeData.anime)}&season=${encodeURIComponent(seasonData.season)}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                查看该季度所有词汇
              </Link>
              <Link
                href={`/search?series=${encodeURIComponent(seriesData.series)}&anime=${encodeURIComponent(animeData.anime)}&season=${encodeURIComponent(seasonData.season)}`}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                在该季度中搜索
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
  const allSeries = getAnimeSeries();
  const paths: { series: string; anime: string; season: string }[] = [];
  
  allSeries.forEach(series => {
    series.animes.forEach(anime => {
      anime.seasons.forEach(season => {
        paths.push({
          series: series.series,
          anime: anime.anime,
          season: season.season
        });
      });
    });
  });
  
  return paths;
}