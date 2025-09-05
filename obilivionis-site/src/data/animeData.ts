// 动态动画数据配置
import { AnimeSeries } from '@/types/vocab';

// 静态配置，但设计为易于扩展
// 当添加新的集数时，只需要在这里添加对应的配置即可
const animeSeriesConfig: AnimeSeries[] = [
  {
    series: "BanG-Dream",
    animes: [
      {
        anime: "MyGO",
        seasons: [
          {
            season: "S1",
            episodes: [
              {
                episode: "Ep8",
                vocabCount: 0, // 将在运行时计算
                filePath: "/data/BanG-Dream/MyGO/S1/Ep8/ep8.json"
              }
              // 添加新集数时，在这里添加新的条目
              // {
              //   episode: "Ep9",
              //   vocabCount: 0,
              //   filePath: "/data/BanG-Dream/MyGO/S1/Ep9/ep9.json"
              // }
            ],
            totalVocabCount: 0 // 将在运行时计算
          }
          // 添加新季度时，在这里添加新的条目
        ],
        totalVocabCount: 0 // 将在运行时计算
      }
      // 添加新动画时，在这里添加新的条目
    ],
    totalVocabCount: 0 // 将在运行时计算
  }
  // 添加新系列时，在这里添加新的条目
];

export function getAnimeSeriesConfig(): AnimeSeries[] {
  return animeSeriesConfig;
}

// 获取所有JSON文件路径
export function getAllDataPaths(): string[] {
  const paths: string[] = [];
  const config = getAnimeSeriesConfig();
  
  config.forEach(series => {
    series.animes.forEach(anime => {
      anime.seasons.forEach(season => {
        season.episodes.forEach(episode => {
          paths.push(episode.filePath);
        });
      });
    });
  });
  
  return paths;
}

// 根据文件路径获取来源信息
export function getSourceFromPath(filePath: string) {
  const config = getAnimeSeriesConfig();
  
  for (const series of config) {
    for (const anime of series.animes) {
      for (const season of anime.seasons) {
        for (const episode of season.episodes) {
          if (episode.filePath === filePath) {
            return {
              series: series.series,
              anime: anime.anime,
              season: season.season,
              episode: episode.episode
            };
          }
        }
      }
    }
  }
  return null;
}