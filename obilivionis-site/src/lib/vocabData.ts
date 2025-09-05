import { VocabData, VocabListItem, SearchFilters, AnimeSeries, VocabStats, VocabWord } from '@/types/vocab';
import { getAnimeSeriesConfig, getSourceFromPath } from '@/data/animeData';

// 动态导入JSON文件的映射
const dataFileImports: { [key: string]: () => Promise<any> } = {
  '/data/BanG-Dream/MyGO/S1/Ep8/ep8.json': () => import('../../data/BanG-Dream/MyGO/S1/Ep8/ep8.json')
};

// 缓存数据
let cachedVocabData: VocabData | null = null;
let cachedAnimeSeries: AnimeSeries[] | null = null;

// 同步加载JSON文件（用于已知的静态文件）
function loadJsonFile(filePath: string): any {
  try {
    // 对于已知的文件路径，直接返回导入的数据
    if (filePath === '/data/BanG-Dream/MyGO/S1/Ep8/ep8.json') {
      // 直接导入已知的JSON文件
      const ep8Data = require('../../data/BanG-Dream/MyGO/S1/Ep8/ep8.json');
      return ep8Data;
    }
    return {};
  } catch (error) {
    console.error(`Error loading JSON file ${filePath}:`, error);
    return {};
  }
}

// 获取动画系列数据
function getAnimeSeriesData(): AnimeSeries[] {
  if (cachedAnimeSeries) {
    return cachedAnimeSeries;
  }

  // 获取动态配置并计算实际词汇数量
  const series = JSON.parse(JSON.stringify(getAnimeSeriesConfig())) as AnimeSeries[];
  
  series.forEach(seriesData => {
    let seriesTotalVocab = 0;
    
    seriesData.animes.forEach(anime => {
      let animeTotalVocab = 0;
      
      anime.seasons.forEach(season => {
        let seasonTotalVocab = 0;
        
        season.episodes.forEach(episode => {
          const data = loadJsonFile(episode.filePath);
          if (data && Object.keys(data).length > 0) {
            episode.vocabCount = Object.keys(data).length;
            seasonTotalVocab += episode.vocabCount;
          }
        });
        
        season.totalVocabCount = seasonTotalVocab;
        animeTotalVocab += seasonTotalVocab;
      });
      
      anime.totalVocabCount = animeTotalVocab;
      seriesTotalVocab += animeTotalVocab;
    });
    
    seriesData.totalVocabCount = seriesTotalVocab;
  });

  cachedAnimeSeries = series;
  return series;
}

// 加载所有词汇数据
export function getVocabData(): VocabData {
  if (cachedVocabData) {
    return cachedVocabData;
  }

  const allVocabData: VocabData = {};
  const seriesConfig = getAnimeSeriesConfig();
  
  // 处理所有数据文件
  seriesConfig.forEach(series => {
    series.animes.forEach(anime => {
      anime.seasons.forEach(season => {
        season.episodes.forEach(episode => {
          const jsonData = loadJsonFile(episode.filePath);
          const sourceInfo = getSourceFromPath(episode.filePath);
          
          if (!sourceInfo || !jsonData || Object.keys(jsonData).length === 0) return;
          
          // 为每个词汇添加来源信息
          Object.entries(jsonData).forEach(([word, vocabInfo]: [string, any]) => {
            const vocabWithSource: VocabWord = {
              ...vocabInfo,
              source: sourceInfo
            };
            
            // 如果词汇已存在，合并数据
            if (allVocabData[word]) {
              allVocabData[word].count += vocabWithSource.count;
              allVocabData[word].sentences.push(...vocabWithSource.sentences);
              // 保持第一次出现的词汇信息（meaning, furigana, romaji等）
              if (!allVocabData[word].meaning && vocabWithSource.meaning) {
                allVocabData[word].meaning = vocabWithSource.meaning;
              }
              if (!allVocabData[word].furigana && vocabWithSource.furigana) {
                allVocabData[word].furigana = vocabWithSource.furigana;
              }
              if (!allVocabData[word].romaji && vocabWithSource.romaji) {
                allVocabData[word].romaji = vocabWithSource.romaji;
              }
              if (!allVocabData[word].level && vocabWithSource.level) {
                allVocabData[word].level = vocabWithSource.level;
              }
            } else {
              allVocabData[word] = vocabWithSource;
            }
          });
        });
      });
    });
  });

  cachedVocabData = allVocabData;
  return allVocabData;
}

// 获取动画系列结构
export function getAnimeSeries(): AnimeSeries[] {
  return getAnimeSeriesData();
}

// 获取统计信息
export function getVocabStats(): VocabStats {
  const vocabData = getVocabData();
  const series = getAnimeSeries();
  
  let totalSeasons = 0;
  let totalEpisodes = 0;
  
  series.forEach(s => {
    s.animes.forEach(a => {
      totalSeasons += a.seasons.length;
      a.seasons.forEach(season => {
        totalEpisodes += season.episodes.length;
      });
    });
  });

  return {
    totalWords: Object.keys(vocabData).length,
    totalSeries: series.length,
    totalAnimes: series.reduce((sum, s) => sum + s.animes.length, 0),
    totalSeasons,
    totalEpisodes
  };
}

// 获取词汇列表（用于列表页面）
export function getVocabList(): VocabListItem[] {
  const data = getVocabData();
  return Object.entries(data).map(([word, vocabInfo]) => ({
    word,
    meaning: vocabInfo.meaning,
    furigana: vocabInfo.furigana,
    romaji: vocabInfo.romaji,
    level: vocabInfo.level,
    count: vocabInfo.count,
    source: vocabInfo.source
  }));
}

// 根据关键词搜索词汇
export function searchVocab(query: string, filters?: SearchFilters): VocabListItem[] {
  const vocabList = getVocabList();
  
  let filteredList = vocabList.filter(item => 
    item.word.includes(query) || 
    item.word.toLowerCase().includes(query.toLowerCase())
  );

  // 应用筛选条件
  if (filters) {
    if (filters.jlptLevel) {
      filteredList = filteredList.filter(item => item.level === filters.jlptLevel);
    }
    if (filters.minEpisodeCount) {
      filteredList = filteredList.filter(item => item.count >= (filters.minEpisodeCount || 1));
    }
    if (filters.series) {
      filteredList = filteredList.filter(item => item.source.series === filters.series);
    }
    if (filters.anime) {
      filteredList = filteredList.filter(item => item.source.anime === filters.anime);
    }
    if (filters.season) {
      filteredList = filteredList.filter(item => item.source.season === filters.season);
    }
  }

  // 按出现频率排序
  return filteredList.sort((a, b) => b.count - a.count);
}

// 获取单个词汇详情
export function getVocabDetail(word: string) {
  const data = getVocabData();
  return data[word] || null;
}

// 获取所有可用的JLPT等级
export function getAvailableJlptLevels(): string[] {
  const data = getVocabData();
  const levels = new Set<string>();
  Object.values(data).forEach(vocab => {
    if (vocab.level) {
      levels.add(vocab.level);
    }
  });
  return Array.from(levels).sort();
}

// 获取所有可用的动画系列
export function getAvailableSeries(): string[] {
  const series = getAnimeSeries();
  return series.map(s => s.series);
}

// 获取指定系列的动画列表
export function getAvailableAnimes(seriesName?: string): string[] {
  const series = getAnimeSeries();
  if (seriesName) {
    const targetSeries = series.find(s => s.series === seriesName);
    return targetSeries ? targetSeries.animes.map(a => a.anime) : [];
  }
  return series.flatMap(s => s.animes.map(a => a.anime));
}

// 获取指定动画的季度列表
export function getAvailableSeasons(seriesName?: string, animeName?: string): string[] {
  const series = getAnimeSeries();
  
  if (seriesName && animeName) {
    const targetSeries = series.find(s => s.series === seriesName);
    if (targetSeries) {
      const targetAnime = targetSeries.animes.find(a => a.anime === animeName);
      return targetAnime ? targetAnime.seasons.map(s => s.season) : [];
    }
  }
  
  return series.flatMap(s => 
    s.animes.flatMap(a => a.seasons.map(season => season.season))
  );
}