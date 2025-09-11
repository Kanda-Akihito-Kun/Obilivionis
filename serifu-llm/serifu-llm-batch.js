#!/usr/bin/env node
/**
 * 使用LLM进行日语分词、翻译、分级、归纳的SRT处理脚本（批处理优化版）
 * 通过批量处理和上下文增强来提高效率和准确率
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SRTProcessorLLMBatch {
    constructor() {
        // 硅基流动的 deepseek-ai/DeepSeek-V2.5 基本上是最便宜的能用的模型
        this.apiKey = process.env.SILICONFLOW_API_KEY || process.env.SILICONFLOW_TOKEN || '';
        this.model = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3';
        this.llmUrl = 'https://api.siliconflow.cn/v1/chat/completions';
        this.vocabulary = {};
        this.jlptOrder = {
            '': 0,
            'N5': 1,
            'N4': 2,
            'N3': 3,
            'N2': 4,
            'N1': 5,
            'N0': 6
        };
        
        // 专有词列表
        this.priorityWords = [
            '春日影', 'MyGO', 'バンドリ', 'CRYCHIC',
        ];
        
        // 批处理大小（考虑模型上下文限制和JSON解析稳定性，设置为较小值）
        this.batchSize = 5;
    }
    
    parseSRT(srtContent) {
        console.log('\n=== 开始解析SRT文件 ===');
        
        const entries = [];
        const blocks = srtContent.trim().split(/\n\s*\n/);
        
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length >= 4) {
                // 提取时间范围
                const timeLine = lines[1];
                const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
                
                if (timeMatch) {
                    const [, startTime, endTime] = timeMatch;
                    const timeRange = `${startTime} --> ${endTime}`;
                    
                    // 按 srt 固定格式提取
                    const japanese = (lines[3] || '').trim();
                    const chinese = (lines[2] || '').trim();
                    
                    if (japanese) {
                        entries.push({
                            japanese,
                            chinese,
                            time_range: timeRange
                        });
                    }
                }
            }
        }
        
        console.log(`解析完成，共 ${entries.length} 个条目`);
        return entries;
    }
    
    async callLLM(prompt, maxRetries = 2) {
        if (!this.apiKey) {
            console.log('❌ 未检测到 API 密钥。请设置环境变量 SILICONFLOW_API_KEY。');
            return null;
        }
        console.log(`🔄 开始调用LLM API (模型: ${this.model})`);
        const agent = new https.Agent({ keepAlive: true });
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const payload = {
                    model: this.model,
                    messages: [
                        { role: 'system', content: '你是一个喜欢看番的老二次元，同时你是一名专业的日语分词与词汇分析助手。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1,
                    top_p: 0.9,
                    max_tokens: 1500,
                    stream: false
                };
                
                console.log(`    📡 发送API请求 (尝试 ${attempt + 1}/${maxRetries})...`);
                const response = await fetch(this.llmUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(payload),
                    agent
                });
                
                console.log(`    📥 收到响应: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.log(`    ❌ API错误: ${errorText}`);
                    if (attempt === maxRetries - 1) {
                        return null;
                    }
                    continue;
                }
                
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                
                if (content) {
                    console.log(`    ✅ API调用成功，响应长度: ${content.length}`);
                    return content;
                } else {
                    console.log('    ❌ 响应格式错误');
                    if (attempt === maxRetries - 1) {
                        return null;
                    }
                }
                
            } catch (error) {
                console.log(`    ❌ 请求失败: ${error.message}`);
                if (attempt === maxRetries - 1) {
                    return null;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
        return null;
    }
    
    async tokenizeAndAnalyzeBatch(entries) {
        console.log('\n--- 开始批量LLM分词分析 ---');
        
        // 构建批量分析的prompt
        const exampleTexts = entries.map((entry, index) => {
            const cleanText = entry.japanese.replace(/[「」『』（）()《》<>【】？！。、，]/g, '').trim();
            
            // 如果有多句，只选择最长的一句
            let selectedJapanese = cleanText;
            let selectedChinese = entry.chinese;
            
            if (cleanText.includes('\n') || entry.chinese.includes('\n')) {
                const japaneseLines = cleanText.split('\n').filter(line => line.trim());
                const chineseLines = entry.chinese.split('\n').filter(line => line.trim());
                
                if (japaneseLines.length > 1) {
                    // 找到最长的日文句子
                    let maxLength = 0;
                    let maxIndex = 0;
                    japaneseLines.forEach((line, idx) => {
                        if (line.length > maxLength) {
                            maxLength = line.length;
                            maxIndex = idx;
                        }
                    });
                    selectedJapanese = japaneseLines[maxIndex];
                    selectedChinese = chineseLines[maxIndex] || chineseLines[0] || entry.chinese;
                }
            }
            
            return {
                index: index + 1,
                japanese: selectedJapanese,
                chinese: selectedChinese
            };
        }).filter(item => item.japanese);
        
        if (exampleTexts.length === 0) {
            return [];
        }
        
        console.log(`批量处理 ${exampleTexts.length} 个文本片段`);
        
        // 构建增强的prompt，包含例句和中文翻译
        const prompt = `请对以下日语文本进行详细的词汇分析。每个文本都提供了对应的中文翻译作为参考上下文。

文本列表：
${exampleTexts.map(item => `${item.index}. 日文：${item.japanese}\n   中文：${item.chinese}`).join('\n\n')}

请为每个文本分别进行分词分析，按照以下JSON格式输出：

\`\`\`json
{
  "results": [
    {
      "text_index": 1,
      "words": [
        {
          "word": "词汇原形（动词要转换成う型）",
          "meaning": "中文含义",
          "furigana": "假名读音",
          "romaji": "罗马音",
          "level": "JLPT等级(N1-N5，实在匹配不到结果的情况下进行逐字拆分推测，最后实在不知道难度的话再设为N0)",
          "pos": "词性"
        }
      ]
    }
  ]
}
\`\`\`

注意事项：
0. 输出格式必须严格遵照给出的JSON格式，只输出JSON对象，不要其他解释文字；
1. 只输出有意义的实词（名词、动词、形容词、副词等），跳过助词（は、が、を、に等）、助动词（だ、です、ます等）；
2. 对于专有名词（如人名、地名、品牌名等）以及英语单词，level设为"N0"；
3. 合并动词变位形式到原形（比如 終わらせて　-> 終わる）；
4. 优先识别这些专有词：${this.priorityWords.join(', ')}；
6. 如果遇到含义不明确或无法分辨的词汇/专有名词，请结合提供的中文翻译进行理解，并优先从日本动画作品领域进行匹配（如角色名、乐队/团体名、歌曲名、舞台名等），并采用业界常用中文译名；
7. 利用中文翻译来帮助理解日文的语境和含义，提高分词准确性；
`;
        
        const response = await this.callLLM(prompt);
        
        if (!response) {
            console.log('批量LLM分析失败');
            return [];
        }
        
        try {
            // 提取JSON部分
            const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
            let jsonStr;
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            } else {
                // 如果没有代码块，尝试直接解析
                jsonStr = response;
            }
            
            // 清理和修复常见的JSON格式问题
            jsonStr = jsonStr.trim();
            // 修复缺少引号的属性名
            jsonStr = jsonStr.replace(/(\s+)(\w+)("\s*:)/g, '$1"$2$3');
            // 修复多余的逗号
            jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
            
            // 解析JSON
            const result = JSON.parse(jsonStr);
            
            if (result.results && Array.isArray(result.results)) {
                console.log(`批量LLM分析成功，处理了 ${result.results.length} 个文本`);
                
                // 将结果展平为单个词汇数组
                const allTokens = [];
                for (const textResult of result.results) {
                    if (textResult.words && Array.isArray(textResult.words)) {
                        allTokens.push(...textResult.words);
                    }
                }
                
                console.log(`总共提取了 ${allTokens.length} 个词汇`);
                return allTokens;
            } else {
                console.log('    LLM返回格式错误：缺少results字段或不是数组');
                return [];
            }
            
        } catch (error) {
            console.log(`批量LLM分析JSON解析失败: ${error.message}`);
            console.log('原始响应:', response.substring(0, 800) + '...');
            
            // 尝试更激进的修复
            try {
                let fixedJson = response;
                // 移除markdown代码块
                fixedJson = fixedJson.replace(/```json\s*|\s*```/g, '');
                // 移除多余的文本
                const jsonStart = fixedJson.indexOf('{');
                const jsonEnd = fixedJson.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    fixedJson = fixedJson.substring(jsonStart, jsonEnd + 1);
                    // 再次尝试修复
                    fixedJson = fixedJson.replace(/(\s+)(\w+)("\s*:)/g, '$1"$2$3');
                    fixedJson = fixedJson.replace(/,\s*([}\]])/g, '$1');
                    
                    const result = JSON.parse(fixedJson);
                    if (result.results && Array.isArray(result.results)) {
                        console.log('JSON修复成功！');
                        const allWords = [];
                        result.results.forEach(textResult => {
                            if (textResult.words && Array.isArray(textResult.words)) {
                                allWords.push(...textResult.words);
                            }
                        });
                        return allWords;
                    }
                }
            } catch (fixError) {
                console.log(`JSON修复也失败了: ${fixError.message}`);
            }
            
            return [];
        }
    }
    
    async buildVocabularyIndex(entries) {
        console.log('\n=== 开始构建词汇索引（批处理模式） ===');
        console.log(`总条目数: ${entries.length}`);
        console.log(`批处理大小: ${this.batchSize}`);
        
        const startTime = Date.now();
        
        // 将条目分批处理
        const batches = [];
        for (let i = 0; i < entries.length; i += this.batchSize) {
            batches.push(entries.slice(i, i + this.batchSize));
        }
        
        console.log(`分为 ${batches.length} 个批次进行处理`);
        
        // 处理每个批次
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`\n[批次 ${batchIndex + 1}/${batches.length}] 处理 ${batch.length} 个条目`);
            
            const tokens = await this.tokenizeAndAnalyzeBatch(batch);
            
            // 将词汇添加到索引中
            for (const token of tokens) {
                if (token.word && token.word.trim()) {
                    const word = token.word.trim();
                    
                    if (!this.vocabulary[word]) {
                        this.vocabulary[word] = {
                            word: word,
                            meaning: token.meaning || '',
                            furigana: token.furigana || '',
                            romaji: token.romaji || '',
                            level: token.level || 'N0',
                            pos: token.pos || '',
                            count: 0,
                            sentences: []
                        };
                        console.log(`新词汇: ${word} -> ${token.level} (${token.meaning})`);
                    }
                    
                    this.vocabulary[word].count++;
                    
                    // 添加例句（从当前批次中查找包含该词汇的句子）
                    for (const entry of batch) {
                        if (entry.japanese.includes(word) || entry.japanese.includes(token.furigana)) {
                            // 检查是否已经存在相同的例句
                            const existingSentence = this.vocabulary[word].sentences.find(
                                s => s.japanese === entry.japanese
                            );
                            
                            if (!existingSentence) {
                                this.vocabulary[word].sentences.push({
                                    japanese: entry.japanese,
                                    chinese: entry.chinese,
                                    time_range: entry.time_range
                                });
                            }
                        }
                    }
                }
            }
            
            // 批次间稍作延迟，避免API限流
            if (batchIndex < batches.length - 1) {
                console.log('等待 2 秒后处理下一批次...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log(`\n词汇总数: ${Object.keys(this.vocabulary).length}`);
        console.log(`\n⏱️  LLM处理耗时: ${duration.toFixed(2)} 秒`);
        
        return this.vocabulary;
    }
    
    sortVocabularyByJLPT(vocabulary) {
        console.log('\n=== 按JLPT等级排序 ===');
        
        const sortedEntries = Object.entries(vocabulary).sort((a, b) => {
            const levelA = this.jlptOrder[a[1].level] || this.jlptOrder['N0'];
            const levelB = this.jlptOrder[b[1].level] || this.jlptOrder['N0'];
            
            if (levelA !== levelB) {
                return levelA - levelB;
            }
            
            return b[1].count - a[1].count;
        });
        
        const sortedVocabulary = Object.fromEntries(sortedEntries);
        
        // 统计各等级词汇数量
        const levelCounts = {};
        for (const [word, info] of Object.entries(sortedVocabulary)) {
            const level = info.level || '未匹配';
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        }
        
        console.log('各等级词汇数量:');
        for (const [level, count] of Object.entries(levelCounts)) {
            console.log(`  ${level}: ${count} 个`);
        }
        
        return sortedVocabulary;
    }
    
    async processSRTFile(srtFilePath, outputPath) {
        try {
            console.log(`\n🎬 开始处理SRT文件: ${srtFilePath}`);
            
            // 读取SRT文件
            const srtContent = await fs.readFile(srtFilePath, 'utf-8');
            
            // 解析SRT
            const entries = this.parseSRT(srtContent);
            
            if (entries.length === 0) {
                console.log('❌ 未找到有效的SRT条目');
                return;
            }
            
            // 构建词汇索引（批处理模式）
            await this.buildVocabularyIndex(entries);
            
            // 按JLPT等级排序
            const sortedVocabulary = this.sortVocabularyByJLPT(this.vocabulary);
            
            // 准备输出数据
            const outputData = {
                metadata: {
                    source_file: path.basename(srtFilePath),
                    processed_at: new Date().toISOString(),
                    total_entries: entries.length,
                    total_vocabulary: Object.keys(sortedVocabulary).length,
                    processing_mode: 'batch'
                },
                vocabulary: sortedVocabulary
            };
            
            // 确保输出目录存在
            await fs.ensureDir(path.dirname(outputPath));
            
            // 写入输出文件
            await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
            
            console.log('\n✅ 处理完成！');
            console.log(`词汇数量: ${Object.keys(sortedVocabulary).length}`);
            console.log(`输出文件: ${outputPath}`);
            
            console.log(`\n🎉 成功处理！生成了 ${Object.keys(sortedVocabulary).length} 个词汇条目`);
            
        } catch (error) {
            console.error('❌ 处理过程中发生错误:', error.message);
            throw error;
        }
    }
}

async function main() {
    try {
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            console.log('使用方法: node serifu-llm-batch.js <SRT文件路径> [输出文件路径]');
            console.log('示例: node serifu-llm-batch.js example.srt');
            process.exit(1);
        }
        
        const srtFilePath = path.resolve(args[0]);
        const outputPath = args[1] ? path.resolve(args[1]) : path.join(__dirname, 'output', `${path.basename(srtFilePath, '.srt')}-batch.json`);
        
        // 检查输入文件是否存在
        if (!await fs.pathExists(srtFilePath)) {
            console.error(`❌ 文件不存在: ${srtFilePath}`);
            process.exit(1);
        }
        
        console.log('🚀 SRT处理器 (批处理优化版) 启动');
        console.log(`📁 输入文件: ${srtFilePath}`);
        console.log(`📁 输出文件: ${outputPath}`);
        
        const processor = new SRTProcessorLLMBatch();
        await processor.processSRTFile(srtFilePath, outputPath);
        
    } catch (error) {
        console.error('❌ 程序执行失败:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('serifu-llm-batch.js')) {
    main();
}

export default SRTProcessorLLMBatch;