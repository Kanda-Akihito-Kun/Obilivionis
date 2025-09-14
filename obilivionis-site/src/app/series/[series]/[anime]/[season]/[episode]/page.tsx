import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnimeSeries, getEpisodeVocabList } from "@/lib/vocabData";

interface EpisodeDetailPageProps {
  params: Promise<{
    series: string;
    anime: string;
    season: string;
    episode: string;
  }>;
}

export default async function EpisodeDetailPage({ params }: EpisodeDetailPageProps) {
  const resolvedParams = await params;
  const decodedSeries = decodeURIComponent(resolvedParams.series);
  const decodedAnime = decodeURIComponent(resolvedParams.anime);
  const decodedSeason = decodeURIComponent(resolvedParams.season);
  const decodedEpisode = decodeURIComponent(resolvedParams.episode);
  
  const allSeries = await getAnimeSeries();
  const seriesData = allSeries.find(s => s.series === decodedSeries);
  const animeData = seriesData?.animes.find(a => a.anime === decodedAnime);
  const seasonData = animeData?.seasons.find(s => s.season === decodedSeason);
  const episodeData = seasonData?.episodes.find(e => e.episode === decodedEpisode);

  if (!seriesData || !animeData || !seasonData || !episodeData) {
    notFound();
  }
  
  // 获取该集的词汇数据
  const episodeVocab = await getEpisodeVocabList(
    decodedSeries,
    decodedAnime,
    decodedSeason,
    decodedEpisode
  );

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
            <Link 
              href={`/series/${encodeURIComponent(seriesData.series)}/${encodeURIComponent(animeData.anime)}/${encodeURIComponent(seasonData.season)}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {seasonData.season}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">{episodeData.episode}</span>
          </div>
        </nav>

        {/* 集数详情 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {episodeData.episode}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {seriesData.series} - {animeData.anime} - {seasonData.season}
            </p>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {episodeData.vocabCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">词汇总数</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {episodeVocab.filter(v => v.level).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">JLPT词汇</div>
            </div>
          </div>

          {/* 词汇列表 */}
          {episodeVocab.length > 0 ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                本集词汇 ({episodeVocab.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {episodeVocab.map((vocab) => (
                  <Link
                    key={vocab.word}
                    href={`/vocab/${encodeURIComponent(vocab.word)}?series=${encodeURIComponent(seriesData.series)}&anime=${encodeURIComponent(animeData.anime)}&season=${encodeURIComponent(seasonData.season)}&episode=${encodeURIComponent(episodeData.episode)}`}
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
                    {vocab.meaning && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {vocab.meaning}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                <span className="text-4xl">📚</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                暂无词汇数据
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                该集的词汇数据正在处理中，请稍后再试。
              </p>
            </div>
          )}

          {/* 快速导航 */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              快速导航
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/vocab?series=${encodeURIComponent(seriesData.series)}&anime=${encodeURIComponent(animeData.anime)}&season=${encodeURIComponent(seasonData.season)}&episode=${encodeURIComponent(episodeData.episode)}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                词汇筛选页面
              </Link>
              <Link
                href={`/search?series=${encodeURIComponent(seriesData.series)}&anime=${encodeURIComponent(animeData.anime)}&season=${encodeURIComponent(seasonData.season)}&episode=${encodeURIComponent(episodeData.episode)}`}
                className="border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                在该集中搜索
              </Link>
            </div>
          </div>

          {/* 集数导航 */}
          <div className="mt-6 flex justify-between items-center">
            {/* 上一集 */}
            <div>
              {(() => {
                const currentIndex = seasonData.episodes.findIndex(e => e.episode === episodeData.episode);
                const prevEpisode = currentIndex > 0 ? seasonData.episodes[currentIndex - 1] : null;
                return prevEpisode ? (
                  <Link
                    href={`/series/${encodeURIComponent(seriesData.series)}/${encodeURIComponent(animeData.anime)}/${encodeURIComponent(seasonData.season)}/${encodeURIComponent(prevEpisode.episode)}`}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <span className="mr-2">←</span>
                    上一集: {prevEpisode.episode}
                  </Link>
                ) : (
                  <div className="text-gray-400">已是第一集</div>
                );
              })()}
            </div>

            {/* 下一集 */}
            <div>
              {(() => {
                const currentIndex = seasonData.episodes.findIndex(e => e.episode === episodeData.episode);
                const nextEpisode = currentIndex < seasonData.episodes.length - 1 ? seasonData.episodes[currentIndex + 1] : null;
                return nextEpisode ? (
                  <Link
                    href={`/series/${encodeURIComponent(seriesData.series)}/${encodeURIComponent(animeData.anime)}/${encodeURIComponent(seasonData.season)}/${encodeURIComponent(nextEpisode.episode)}`}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                  >
                    下一集: {nextEpisode.episode}
                    <span className="ml-2">→</span>
                  </Link>
                ) : (
                  <div className="text-gray-400">已是最后一集</div>
                );
              })()}
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
  const paths: { series: string; anime: string; season: string; episode: string }[] = [];
  
  allSeries.forEach(series => {
    series.animes.forEach(anime => {
      anime.seasons.forEach(season => {
        season.episodes.forEach(episode => {
          paths.push({
            series: series.series,
            anime: anime.anime,
            season: season.season,
            episode: episode.episode
          });
        });
      });
    });
  });
  
  return paths;
}