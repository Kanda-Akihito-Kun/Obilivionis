import { notFound } from "next/navigation";
import Link from "next/link";
import { getVocabDetail, getVocabList } from "@/lib/vocabData";
import MediaPlayer from "@/components/MediaPlayer";
import { getMediaUrls } from "@/lib/mediaUtils";

interface VocabDetailPageProps {
  params: Promise<{
    word: string;
  }>;
}
export default async function VocabDetailPage({ params }: VocabDetailPageProps) {
  const resolvedParams = await params;
  const decodedWord = decodeURIComponent(resolvedParams.word);
  const vocabDetail = await getVocabDetail(decodedWord);

  if (!vocabDetail) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link
            href="/vocab"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← 返回词汇库
          </Link>
        </div>

        {/* 词汇信息卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：基本信息 */}
            <div>
              <div className="text-center mb-6">
                <h1 className="text-8xl font-bold text-gray-900 dark:text-white">
                  {vocabDetail.word}
                </h1>
                {vocabDetail.furigana && (
                  <div className="text-2xl text-gray-600 dark:text-gray-400 mt-2">
                    {vocabDetail.furigana}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">

                

                

              </div>
            </div>

            {/* 右侧：统计信息和来源信息 */}
            <div>
              {/* 来源信息 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">词汇来源</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">动画系列:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{vocabDetail.source.series}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">动画名称:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{vocabDetail.source.anime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">季度:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{vocabDetail.source.season}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">集数:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{vocabDetail.source.episode}</span>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {vocabDetail.count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    出现次数
                  </div>
                </div>
                
                {vocabDetail.level && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {vocabDetail.level}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      JLPT等级
                    </div>
                  </div>
                )}
                
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center sm:col-span-2">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {vocabDetail.sentences.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    例句数量
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 例句列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            例句与上下文
          </h2>
          
          <div className="space-y-8">
            {vocabDetail.sentences.map((sentence, index) => {
              // 获取媒体文件URL
              const { imageUrl, audioUrl } = getMediaUrls(sentence.time_range, vocabDetail.source);
              
              return (
                <div key={index} className="space-y-4">
                  {/* 传统的例句显示 */}
                  <div className="border-l-4 border-blue-500 pl-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-r-lg">
                    {/* 时间轴信息 */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-mono">
                      {sentence.time_range}
                    </div>
                    
                    {/* 日语原文 */}
                    <div className="text-lg text-gray-900 dark:text-white mb-2 font-medium">
                      {sentence.japanese}
                    </div>
                    
                    {/* 中文翻译 */}
                    <div className="text-gray-600 dark:text-gray-300">
                      {sentence.chinese}
                    </div>
                    
                    {/* 高亮显示当前词汇 */}
                    <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
                      <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                        包含词汇: {vocabDetail.word}
                      </span>
                    </div>
                  </div>
                  
                  {/* 媒体播放器 */}
                  <MediaPlayer
                    imageUrl={imageUrl || undefined}
                    audioUrl={audioUrl || undefined}
                    sentence={sentence}
                    className="ml-6"
                  />
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}

// 生成静态路径（为前100个高频词汇生成静态页面）
export async function generateStaticParams() {
  const vocabList = await getVocabList();
  
  // 为前100个高频词汇生成静态页面，其他使用ISR
  return vocabList
    .slice(0, 100)
    .filter(vocab => {
      // 过滤掉可能导致路径问题的特殊字符
      return !/[\/<>:"|?*]/.test(vocab.word);
    })
    .map((vocab) => ({
      word: encodeURIComponent(vocab.word),
    }));
}

// 启用动态参数，允许ISR
export const dynamicParams = true;

// 启用ISR，24小时重新验证
export const revalidate = 86400;