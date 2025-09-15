import { VocabData, VocabListItem, SearchFilters, AnimeSeries, VocabStats, VocabWord } from '@/types/vocab';
import { getAnimeSeriesConfig, getSourceFromPath } from '../../public/data/animeData';

// 缓存数据
let cachedVocabData: VocabData | null = null;
let cachedAnimeSeries: AnimeSeries[] | null = null;

// 清除缓存的函数（用于开发调试）
export function clearCache() {
  cachedVocabData = null;
  cachedAnimeSeries = null;
}

// 动态加载JSON文件（按需导入）
async function loadJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    // 根据文件路径动态导入对应的数据
    let jsonData: Record<string, unknown>;
    switch (filePath) {
      case '/data/BanG-Dream/MyGO/S1/Ep1/ep1.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep1/ep1.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep2/ep2.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep2/ep2.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep3/ep3.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep3/ep3.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep4/ep4.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep4/ep4.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep5/ep5.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep5/ep5.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep6/ep6.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep6/ep6.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep7/ep7.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep7/ep7.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep8/ep8.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep8/ep8.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep9/ep9.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep9/ep9.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep10/ep10.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep10/ep10.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep11/ep11.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep11/ep11.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep12/ep12.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep12/ep12.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/MyGO/S1/Ep13/ep13.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/MyGO/S1/Ep13/ep13.json');
        jsonData = jsonModule.default;
        break;
      }
      case '/data/BanG-Dream/Ave-Mujica/S1/Ep1/ep1.json': {
        const jsonModule = await import('../../public/data/BanG-Dream/Ave-Mujica/S1/Ep1/ep1.json');
        jsonData = jsonModule.default;
        break;
      }
      default:
        return {};
    }
    
    // 检查是否有新的JSON格式（包含vocabulary字段）
    if (jsonData && typeof jsonData === 'object' && 'vocabulary' in jsonData) {
      return jsonData.vocabulary as Record<string, unknown>;
    }
    
    // 向后兼容：如果没有vocabulary字段，直接返回原数据
    return jsonData as Record<string, unknown>;
  } catch (error) {
    console.error(`Error loading JSON file ${filePath}:`, error);
    return {};
  }
}

// 获取动画系列数据
async function getAnimeSeriesData(): Promise<AnimeSeries[]> {
  if (cachedAnimeSeries) {
    return cachedAnimeSeries;
  }

  // 获取动态配置并计算实际词汇数量
  const series = JSON.parse(JSON.stringify(getAnimeSeriesConfig())) as AnimeSeries[];
  
  for (const seriesData of series) {
    let seriesTotalVocab = 0;
    
    for (const anime of seriesData.animes) {
      let animeTotalVocab = 0;
      
      for (const season of anime.seasons) {
        let seasonTotalVocab = 0;
        
        for (const episode of season.episodes) {
          const data = await loadJsonFile(episode.filePath);
          if (data && Object.keys(data).length > 0) {
            episode.vocabCount = Object.keys(data).length;
            seasonTotalVocab += episode.vocabCount;
          }
        }
        
        season.totalVocabCount = seasonTotalVocab;
        animeTotalVocab += seasonTotalVocab;
      }
      
      anime.totalVocabCount = animeTotalVocab;
      seriesTotalVocab += animeTotalVocab;
    }
    
    seriesData.totalVocabCount = seriesTotalVocab;
  }

  cachedAnimeSeries = series;
  return series;
}

// 加载单个集数的词汇数据
export async function getEpisodeVocabData(filePath: string): Promise<VocabData> {
  const episodeVocabData: VocabData = {};
  const jsonData = await loadJsonFile(filePath);
  const sourceInfo = getSourceFromPath(filePath);
  
  if (!sourceInfo || !jsonData || Object.keys(jsonData).length === 0) {
    return episodeVocabData;
  }
  
  // 为每个词汇添加来源信息
  Object.entries(jsonData).forEach(([word, vocabInfo]) => {
    const vocabData = vocabInfo as Record<string, unknown>;
    
    // 为每个句子添加来源信息
    const sentencesWithSource = (vocabData.sentences as Array<Record<string, unknown>>)?.map((sentence: Record<string, unknown>) => ({
      ...sentence,
      source: sourceInfo
    })) || [];
    
    const vocabWithSource: VocabWord = {
      ...vocabData,
      sentences: sentencesWithSource,
      source: sourceInfo
    } as VocabWord;
    
    episodeVocabData[word] = vocabWithSource;
  });
  
  return episodeVocabData;
}

// 加载所有词汇数据
export async function getVocabData(): Promise<VocabData> {
  if (cachedVocabData) {
    return cachedVocabData;
  }

  const allVocabData: VocabData = {};
  const seriesConfig = getAnimeSeriesConfig();
  
  // 处理所有数据文件
  for (const series of seriesConfig) {
    for (const anime of series.animes) {
      for (const season of anime.seasons) {
        for (const episode of season.episodes) {
          const jsonData = await loadJsonFile(episode.filePath);
          const sourceInfo = getSourceFromPath(episode.filePath);
          
          if (!sourceInfo || !jsonData || Object.keys(jsonData).length === 0) continue;
          
          // 为每个词汇添加来源信息
          Object.entries(jsonData).forEach(([word, vocabInfo]) => {
            const vocabData = vocabInfo as Record<string, unknown>;
            
            // 为每个句子添加来源信息
            const sentencesWithSource = (vocabData.sentences as Array<Record<string, unknown>>)?.map((sentence: Record<string, unknown>) => ({
              ...sentence,
              source: sourceInfo
            })) || [];
            
            const vocabWithSource: VocabWord = {
              ...vocabData,
              sentences: sentencesWithSource,
              source: sourceInfo
            } as VocabWord;
            
            // 如果词汇已存在，合并数据
            if (allVocabData[word]) {
              allVocabData[word].count += vocabWithSource.count;
              
              // 合并句子时去重，基于句子内容和来源信息
              const existingSentences = allVocabData[word].sentences;
              const newSentences = vocabWithSource.sentences.filter(newSentence => {
                return !existingSentences.some(existingSentence => 
                  existingSentence.japanese === newSentence.japanese &&
                  existingSentence.chinese === newSentence.chinese &&
                  existingSentence.time_range === newSentence.time_range &&
                  existingSentence.source.series === newSentence.source.series &&
                  existingSentence.source.anime === newSentence.source.anime &&
                  existingSentence.source.season === newSentence.source.season &&
                  existingSentence.source.episode === newSentence.source.episode
                );
              });
              
              allVocabData[word].sentences.push(...newSentences);
              
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
        }
      }
    }
  }

  cachedVocabData = allVocabData;
  return allVocabData;
}

// 获取动画系列结构
export async function getAnimeSeries(): Promise<AnimeSeries[]> {
  return await getAnimeSeriesData();
}

// 获取统计信息
export async function getVocabStats(): Promise<VocabStats> {
  const vocabData = await getVocabData();
  const series = await getAnimeSeries();
  
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
export async function getVocabList(): Promise<VocabListItem[]> {
  const data = await getVocabData();
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
export async function searchVocab(query: string, filters?: SearchFilters): Promise<VocabListItem[]> {
  const vocabList = await getVocabList();
  
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
export async function getVocabDetail(word: string) {
  const data = await getVocabData();
  return data[word] || null;
}

// 获取特定集数的词汇详情
export async function getEpisodeVocabDetail(
  word: string,
  series: string,
  anime: string,
  season: string,
  episode: string
) {
  // 构建文件路径
  const filePath = `/data/${series}/${anime}/${season}/${episode}/${episode.toLowerCase()}.json`;
  
  // 只加载当前集数的数据
  const episodeData = await getEpisodeVocabData(filePath);
  
  return episodeData[word] || null;
}

// 获取所有可用的JLPT等级
export async function getAvailableJlptLevels(): Promise<string[]> {
  const data = await getVocabData();
  const levels = new Set<string>();
  Object.values(data).forEach(vocab => {
    if (vocab.level) {
      levels.add(vocab.level);
    }
  });
  return Array.from(levels).sort();
}

// 获取所有可用的动画系列
export async function getAvailableSeries(): Promise<string[]> {
  const series = await getAnimeSeries();
  return series.map(s => s.series);
}

// 获取指定系列的动画列表
export async function getAvailableAnimes(seriesName?: string): Promise<string[]> {
  const series = await getAnimeSeries();
  if (seriesName) {
    const targetSeries = series.find(s => s.series === seriesName);
    return targetSeries ? targetSeries.animes.map(a => a.anime) : [];
  }
  return series.flatMap(s => s.animes.map(a => a.anime));
}

// 获取指定动画的季度列表
export async function getAvailableSeasons(seriesName?: string, animeName?: string): Promise<string[]> {
  const series = await getAnimeSeries();
  
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

// 获取特定集数的词汇列表
export async function getEpisodeVocabList(
  series: string,
  anime: string,
  season: string,
  episode: string
): Promise<VocabListItem[]> {
  // 构建文件路径
  const filePath = `/data/${series}/${anime}/${season}/${episode}/${episode.toLowerCase()}.json`;
  
  // 只加载当前集数的数据
  const episodeData = await getEpisodeVocabData(filePath);
  const episodeVocab: VocabListItem[] = [];
  
  // 直接处理当前集数的词汇数据
  Object.entries(episodeData).forEach(([word, vocabInfo]) => {
    episodeVocab.push({
      word,
      meaning: vocabInfo.meaning,
      furigana: vocabInfo.furigana,
      romaji: vocabInfo.romaji,
      level: vocabInfo.level,
      count: vocabInfo.count, // 使用原始出现次数
      source: {
        series,
        anime,
        season,
        episode
      }
    });
  });
  
  return episodeVocab.sort((a, b) => b.count - a.count); // 按出现次数降序排列
}