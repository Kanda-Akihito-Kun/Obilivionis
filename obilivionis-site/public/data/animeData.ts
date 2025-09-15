import { AnimeSeries } from '@/types/vocab';

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
                episode: "Ep1",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep1/ep1.json"
              }, {
                episode: "Ep2",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep2/ep2.json"
              }, {
                episode: "Ep3",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep3/ep3.json"
              }, {
                episode: "Ep4",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep4/ep4.json"
              }, {
                episode: "Ep5",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep5/ep5.json"
              }, {
                episode: "Ep6",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep6/ep6.json"
              }, {
                episode: "Ep7",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep7/ep7.json"
              }, {
                episode: "Ep8",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep8/ep8.json"
              }, {
                episode: "Ep9",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep9/ep9.json"
              }, {
                episode: "Ep10",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep10/ep10.json"
              }, {
                episode: "Ep11",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep11/ep11.json"
              }, {
                episode: "Ep12",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep12/ep12.json"
              }, {
                episode: "Ep13",
                vocabCount: 0,
                filePath: "/data/BanG-Dream/MyGO/S1/Ep13/ep13.json"
              },
            ],
            totalVocabCount: 0
          }
        ],
        totalVocabCount: 0
      },{
            anime: "Ave-Mujica",
            seasons: [
                {
                    season: "S1",
                    episodes: [
                        {
                            episode: "Ep1",
                            vocabCount: 0,
                            filePath: "/data/BanG-Dream/Ave-Mujica/S1/Ep1/ep1.json"
                        },
                    ],
                    totalVocabCount: 0
                }
                // 添加新季度时，在这里添加新的条目
            ],
            totalVocabCount: 0 // 将在运行时计算
        }
    ],
    totalVocabCount: 0
  }
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