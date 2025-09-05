// 媒体文件工具函数

/**
 * 将SRT时间格式转换为文件名安全的格式
 * @param timeStr SRT时间格式 (如: "00:00:02,753")
 * @returns 文件名格式 (如: "00-00-02-753")
 */
export function formatTimestampForFilename(timeStr: string): string {
  return timeStr.replace(/:/g, '-').replace(',', '-');
}

/**
 * 根据时间戳和来源信息生成媒体文件URL
 * @param timeRange 时间范围 (如: "00:00:02,753 --> 00:00:04,630")
 * @param source 来源信息
 * @returns 媒体文件URL对象
 */
export function getMediaUrls(timeRange: string, source: {
  series: string;
  anime: string;
  season: string;
  episode: string;
}) {
  // 提取开始时间
  const startTime = timeRange.split(' --> ')[0]?.trim();
  if (!startTime) {
    return { imageUrl: null, audioUrl: null };
  }

  // 格式化时间戳为文件名
  const timestamp = formatTimestampForFilename(startTime);
  
  // 构建媒体文件路径，通过API路由访问
  const basePath = `/api/media/${source.series}/${source.anime}/${source.season}/${source.episode}/media`;
  
  return {
    imageUrl: `${basePath}/${timestamp}.jpg`,
    audioUrl: `${basePath}/${timestamp}.mp3`
  };
}

/**
 * 检查媒体文件是否存在（客户端版本）
 * @param url 文件URL
 * @returns Promise<boolean>
 */
export async function checkMediaExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 预加载媒体文件
 * @param imageUrl 图片URL
 * @param audioUrl 音频URL
 */
export function preloadMedia(imageUrl?: string, audioUrl?: string) {
  if (imageUrl) {
    const img = new Image();
    img.src = imageUrl;
  }
  
  if (audioUrl) {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = audioUrl;
  }
}

/**
 * 批量获取句子的媒体URL
 * @param sentences 句子数组
 * @param source 来源信息
 * @returns 媒体URL映射
 */
export function getBatchMediaUrls(
  sentences: Array<{ time_range: string; japanese: string; chinese: string }>,
  source: { series: string; anime: string; season: string; episode: string }
) {
  const mediaMap = new Map<string, { imageUrl: string; audioUrl: string }>();
  
  sentences.forEach(sentence => {
    const { imageUrl, audioUrl } = getMediaUrls(sentence.time_range, source);
    if (imageUrl && audioUrl) {
      mediaMap.set(sentence.time_range, { imageUrl, audioUrl });
    }
  });
  
  return mediaMap;
}