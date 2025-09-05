// 词汇数据类型定义
export interface Sentence {
  japanese: string;
  chinese: string;
  time_range: string;
}

export interface VocabWord {
  word: string;
  meaning: string; // 词汇含义
  furigana: string; // 假名读音
  romaji: string; // 罗马音
  level: string; // JLPT等级
  count: number; // 出现次数
  sentences: Sentence[];
  // 新增来源信息
  source: {
    series: string;    // 动画系列
    anime: string;     // 动画名字
    season: string;    // 季度
    episode: string;   // 集数
  };
}

export interface VocabData {
  [key: string]: VocabWord;
}

// 动画层级结构类型
export interface AnimeEpisode {
  episode: string;
  vocabCount: number;
  filePath: string;
}

export interface AnimeSeason {
  season: string;
  episodes: AnimeEpisode[];
  totalVocabCount: number;
}

export interface AnimeTitle {
  anime: string;
  seasons: AnimeSeason[];
  totalVocabCount: number;
}

export interface AnimeSeries {
  series: string;
  animes: AnimeTitle[];
  totalVocabCount: number;
}

// 搜索和筛选相关类型
export interface SearchFilters {
  jlptLevel?: string;
  minEpisodeCount?: number;
  series?: string;
  anime?: string;
  season?: string;
}

export interface VocabListItem {
  word: string;
  meaning: string; // 词汇含义
  furigana: string; // 假名读音
  romaji: string; // 罗马音
  level: string; // JLPT等级
  count: number; // 出现次数
  source: {
    series: string;
    anime: string;
    season: string;
    episode: string;
  };
}

// 统计信息类型
export interface VocabStats {
  totalWords: number;
  totalSeries: number;
  totalAnimes: number;
  totalSeasons: number;
  totalEpisodes: number;
}