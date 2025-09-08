#!/usr/bin/env node
// 使用Kuromoji.js进行日语分词的SRT处理脚本

import kuromoji from 'kuromoji';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入词汇列表
const blockedWords = [
    // 助词
    'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より', 'へ',
    'の', 'や', 'か', 'も', 'こそ', 'さえ', 'しか', 'だけ', 'ばかり',
    // 助动词
    'だ', 'である', 'です', 'ます', 'た', 'て', 'で', 'な', 'ない',
    // 其他常见词
    'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ'
];

const priorityWords = [
    '春日影', 'MyGO', 'BanG Dream', 'バンドリ', 'CRYCHIC',
    'ギター', 'ベース', 'ドラム', 'キーボード', 'ライブ', 'コンサート',
    '学校', '先生', '友達', '家族'
];

class SRTProcessor {
    constructor() {
        this.vocabulary = {};
        this.priorityWords = priorityWords;
        this.blockedWords = blockedWords;
        this.jlptOrder = {
            '': 0,
            'N5': 1,
            'N4': 2,
            'N3': 3,
            'N2': 4,
            'N1': 5,
            'N0': 6
        };
        this.tokenizer = null;
    }

    async initializeTokenizer() {
        return new Promise((resolve, reject) => {
            kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, tokenizer) => {
                if (err) {
                    reject(err);
                } else {
                    this.tokenizer = tokenizer;
                    console.log('✅ Kuromoji初始化成功');
                    resolve();
                }
            });
        });
    }

    parseSRT(srtContent) {
        console.log('=== 开始解析SRT文件 ===');
        const entries = [];
        const normalizedContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const blocks = normalizedContent.trim().split('\n\n');

        console.log(`分割后的块数: ${blocks.length}`);

        for (const block of blocks) {
            const trimmedBlock = block.trim();
            if (!trimmedBlock) continue;

            const lines = trimmedBlock.split('\n').map(line => line.trim());

            if (lines.length >= 4) {
                try {
                    const index = parseInt(lines[0]);
                    const timeRange = lines[1];
                    const chineseText = lines[2] || '';
                    const japaneseText = lines[3];

                    if (timeRange.includes('-->') && japaneseText) {
                        entries.push({
                            index,
                            time_range: timeRange,
                            chinese: chineseText,
                            japanese: japaneseText
                        });
                    }
                } catch (error) {
                    continue;
                }
            }
        }

        console.log(`总共解析出条目数: ${entries.length}`);
        return entries;
    }

    cleanText(text) {
        return text.replace(/[「」『』（）()《》<>【】？！。、，]/g, '').trim();
    }

    tokenizeText(text) {
        console.log(`\n--- 开始分词 ---`);
        console.log(`原始文本: ${text}`);

        if (!text || typeof text !== 'string') {
            return [];
        }

        const cleanText = this.cleanText(text);
        console.log(`清理后文本: ${cleanText}`);

        if (!cleanText) {
            return [];
        }

        // 使用Kuromoji进行分词
        const tokens = this.tokenizer.tokenize(cleanText);
        
        // 提取有意义的词汇
        let meaningfulTokens = tokens
            .filter(token => {
                // 过滤掉助词、助动词、记号等
                const pos = token.pos;
                const surface = token.surface_form;
                
                return (
                    surface.length > 1 &&
                    !['助詞', '助動詞', '記号', '補助記号'].includes(pos) &&
                    !this.blockedWords.includes(surface)
                );
            })
            .map(token => token.surface_form);

        console.log(`Kuromoji分词结果: ${meaningfulTokens}`);

        // 处理英语单词：转小写并去除空格
        meaningfulTokens = meaningfulTokens.map(token => {
            if (/^[a-zA-Z\s]+$/.test(token)) {
                return token.toLowerCase().replace(/\s+/g, '');
            }
            return token;
        });

        // 合并以っ结尾的动词变位
        meaningfulTokens = this.mergeVerbConjugations(meaningfulTokens, cleanText);

        // 应用专有词优先匹配
        const finalTokens = this.applyPriorityWords(cleanText, meaningfulTokens);
        console.log(`最终分词结果: ${finalTokens}`);

        return finalTokens;
    }

    mergeVerbConjugations(tokens, originalText) {
        const result = [];
        for (let i = 0; i < tokens.length; i++) {
            const currentToken = tokens[i];
            const nextToken = tokens[i + 1];
            const nextNextToken = tokens[i + 2];
            
            // 检查三个词的组合（如：知っ + て + た = 知ってた）
            if (currentToken.endsWith('っ') && nextToken && nextNextToken &&
                ['て', 'で'].includes(nextToken) && 
                ['た', 'る', 'い', 'も', 'は'].includes(nextNextToken)) {
                const merged = currentToken + nextToken + nextNextToken;
                result.push(merged);
                i += 2; // 跳过接下来的两个词
                console.log(`动词变位合并(3词): ${currentToken} + ${nextToken} + ${nextNextToken} = ${merged}`);
            }
            // 检查两个词的组合（如：知っ + て = 知って）
            else if (currentToken.endsWith('っ') && nextToken && 
                ['た', 'て', 'で', 'ちゃ', 'ちゃう', 'てる', 'てた', 'ている', 'ていた'].includes(nextToken)) {
                const merged = currentToken + nextToken;
                result.push(merged);
                i++; // 跳过下一个词
                console.log(`动词变位合并(2词): ${currentToken} + ${nextToken} = ${merged}`);
            }
            // 检查其他常见动词变位模式
            else if (nextToken && this.isVerbConjugation(currentToken, nextToken)) {
                const merged = currentToken + nextToken;
                result.push(merged);
                i++; // 跳过下一个词
                console.log(`动词变位合并(其他): ${currentToken} + ${nextToken} = ${merged}`);
            }
            else {
                result.push(currentToken);
            }
        }
        return result;
    }

    isVerbConjugation(current, next) {
        // 检查常见的动词变位模式
        const verbEndings = ['る', 'た', 'て', 'で', 'ば', 'ない', 'なかっ', 'ます', 'ました', 'ません', 'ませんでした'];
        const verbStems = ['し', 'き', 'ぎ', 'み', 'び', 'に', 'り', 'い', 'ち'];
        
        // 如果当前词以动词词干结尾，下一个词是动词变位
        if (verbStems.some(stem => current.endsWith(stem)) && verbEndings.includes(next)) {
            return true;
        }
        
        // 特殊情况：ほっとけ = ほっと + け
        if (current === 'ほっと' && next === 'け') {
            return true;
        }
        
        return false;
    }

    applyPriorityWords(text, tokens) {
        const result = [];
        const textLower = text.toLowerCase();
        let i = 0;

        while (i < tokens.length) {
            let matched = false;

            for (const priorityWord of this.priorityWords) {
                const priorityWordLower = priorityWord.toLowerCase();

                if (text.includes(priorityWord) || textLower.includes(priorityWordLower)) {
                    const remaining = tokens.slice(i);
                    const combined = remaining.slice(0, priorityWord.length).join('');

                    if (combined === priorityWord || 
                        combined.toLowerCase() === priorityWordLower ||
                        priorityWord.includes(combined) ||
                        priorityWordLower.includes(combined.toLowerCase())) {
                        result.push(priorityWord);
                        i += Math.min(priorityWord.length, remaining.length);
                        matched = true;
                        console.log(`专有词匹配: ${priorityWord}`);
                        break;
                    }
                }
            }

            if (!matched) {
                result.push(tokens[i]);
                i++;
            }
        }

        return result;
    }

    async getJLPTInfo(word) {
        try {
            // 检查是否为专有名词
            if (this.priorityWords.includes(word)) {
                console.log(`    ✅ ${word} -> N0 (专有名词)`);
                return {
                    word: word,
                    meaning: '专有名词',
                    furigana: '',
                    romaji: '',
                    level: 'N0'
                };
            }

            // 跳过英语单词的查询
            if (/^[a-z]+$/.test(word)) {
                console.log(`    ⏭️ ${word} -> 跳过英语单词`);
                return {
                    word: word,
                    meaning: '英语单词',
                    furigana: '',
                    romaji: '',
                    level: ''
                };
            }

            // 首先尝试主API
            const primaryResult = await this.queryPrimaryAPI(word);
            if (primaryResult.level) {
                return primaryResult;
            }

            // 主API失败时，尝试备用API
            const fallbackResult = await this.queryFallbackAPI(word);
            return fallbackResult;

        } catch (error) {
            console.log(`    ❌ ${word} -> 查询失败: ${error.message}`);
            return {
                word: word,
                meaning: '',
                furigana: '',
                romaji: '',
                level: ''
            };
        }
    }

    async queryPrimaryAPI(word) {
        try {
            console.log(`  查询主API: ${word}`);
            const url = `https://jlpt-vocab-api.vercel.app/api/words?word=${encodeURIComponent(word)}`;
            
            const response = await axios.get(url, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.status === 200 && response.data.words && response.data.words.length > 0) {
                const wordInfo = response.data.words[0];
                
                const result = {
                    word: wordInfo.word || word,
                    meaning: wordInfo.meaning || '',
                    furigana: wordInfo.furigana || '',
                    romaji: wordInfo.romaji || '',
                    level: wordInfo.level ? `N${wordInfo.level}` : ''
                };
                
                console.log(`    ✅ ${word} -> ${result.level} (${result.meaning})`);
                return result;
            }
        } catch (error) {
            console.log(`    主API失败: ${error.message}`);
        }
        
        return {
            word: word,
            meaning: '',
            furigana: '',
            romaji: '',
            level: ''
        };
    }

    async queryFallbackAPI(word) {
        try {
            console.log(`  查询备用API: ${word}`);
            // 使用Jisho.org API作为备用
            const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(word)}`;
            
            const response = await axios.get(url, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.status === 200 && response.data.data && response.data.data.length > 0) {
                const wordData = response.data.data[0];
                const japanese = wordData.japanese && wordData.japanese[0];
                const senses = wordData.senses && wordData.senses[0];
                
                // 从tags中提取JLPT等级
                let jlptLevel = '';
                if (senses && senses.tags) {
                    const jlptTag = senses.tags.find(tag => tag.startsWith('JLPT'));
                    if (jlptTag) {
                        jlptLevel = jlptTag.replace('JLPT ', '').replace(' kanji', '').replace(' vocab', '');
                    }
                }
                
                const result = {
                    word: japanese ? japanese.word || word : word,
                    meaning: senses ? senses.english_definitions.join(', ') : '',
                    furigana: japanese ? japanese.reading || '' : '',
                    romaji: '',
                    level: jlptLevel
                };
                
                console.log(`    ✅ ${word} -> ${result.level} (${result.meaning}) [备用API]`);
                return result;
            }
        } catch (error) {
            console.log(`    备用API失败: ${error.message}`);
        }
        
        console.log(`    ❌ ${word} -> 所有API都未找到`);
        return {
            word: word,
            meaning: '',
            furigana: '',
            romaji: '',
            level: ''
        };
    }

    buildVocabularyIndex(entries) {
        console.log('\n=== 开始构建词汇索引 ===');
        console.log(`条目数量: ${entries.length}`);

        const vocabulary = {};

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            console.log(`\n处理第 ${i + 1}/${entries.length} 个条目:`);
            console.log(`日文: ${entry.japanese}`);

            const tokens = this.tokenizeText(entry.japanese);

            for (const token of tokens) {
                // 英语单词已经在tokenizeText中处理过了
                const normalizedToken = token;

                if (!vocabulary[normalizedToken]) {
                    vocabulary[normalizedToken] = {
                        word: normalizedToken,
                        count: 0,
                        sentences: [],
                        meaning: '',
                        furigana: '',
                        romaji: '',
                        level: ''
                    };
                    console.log(`新词汇: ${normalizedToken}`);
                }

                vocabulary[normalizedToken].count++;
                vocabulary[normalizedToken].sentences.push({
                    japanese: entry.japanese,
                    chinese: entry.chinese,
                    time_range: entry.time_range
                });
            }
        }

        console.log(`词汇总数: ${Object.keys(vocabulary).length}`);
        return vocabulary;
    }

    async enrichWithJLPTData(vocabulary, maxWorkers = 3) {
        console.log(`\n=== 开始查询JLPT信息（${maxWorkers}个并发） ===`);
        const words = Object.keys(vocabulary);
        console.log(`需要查询的词汇数量: ${words.length}`);

        let completedCount = 0;
        const batchSize = maxWorkers;
        
        for (let i = 0; i < words.length; i += batchSize) {
            const batch = words.slice(i, i + batchSize);
            
            try {
                // 串行处理每个词汇，避免API限制
                const results = [];
                for (const word of batch) {
                    const result = await this.getJLPTInfo(word);
                    results.push(result);
                    
                    // 添加延迟避免API限制
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                for (let j = 0; j < results.length; j++) {
                    const word = batch[j];
                    const jlptInfo = results[j];
                    
                    vocabulary[word].level = jlptInfo.level;
                    vocabulary[word].meaning = jlptInfo.meaning;
                    vocabulary[word].furigana = jlptInfo.furigana;
                    vocabulary[word].romaji = jlptInfo.romaji;
                    
                    completedCount++;
                    const progress = (completedCount / words.length * 100).toFixed(1);
                    
                    if (jlptInfo.level) {
                        console.log(`[${completedCount}/${words.length}] (${progress}%) ✅ ${word} -> ${jlptInfo.level}`);
                    } else {
                        console.log(`[${completedCount}/${words.length}] (${progress}%) ❌ ${word} -> 未找到`);
                    }
                }
            } catch (error) {
                console.log(`批次处理失败: ${error.message}`);
                // 处理失败的词汇
                for (const word of batch) {
                    vocabulary[word].level = '';
                    vocabulary[word].meaning = '';
                    vocabulary[word].furigana = '';
                    vocabulary[word].romaji = '';
                    completedCount++;
                }
            }
        }

        console.log('\n=== JLPT查询完成 ===');
        return vocabulary;
    }

    sortVocabularyByJLPT(vocabulary) {
        console.log('\n=== 按JLPT等级排序 ===');

        const vocabItems = Object.entries(vocabulary);
        vocabItems.sort((a, b) => {
            const levelA = this.jlptOrder[a[1].level] || 0;
            const levelB = this.jlptOrder[b[1].level] || 0;
            return levelB - levelA; // 降序排列
        });

        const sortedVocab = {};
        for (const [word, data] of vocabItems) {
            sortedVocab[word] = data;
        }

        // 统计各等级数量
        const levelCounts = {};
        for (const [word, data] of vocabItems) {
            const level = data.level || '未匹配';
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        }

        console.log('各等级词汇数量:');
        for (const level of ['N0', 'N1', 'N2', 'N3', 'N4', 'N5', '未匹配']) {
            const count = levelCounts[level] || 0;
            if (count > 0) {
                console.log(`  ${level}: ${count} 个`);
            }
        }

        return sortedVocab;
    }

    async processSRTFile(srtFilePath, outputPath, maxWorkers = 5) {
        try {
            console.log(`🚀 开始处理SRT文件（Kuromoji.js分词，${maxWorkers}个并发）`);
            console.log(`输入文件: ${srtFilePath}`);
            console.log(`输出文件: ${outputPath}`);

            // 初始化分词器
            await this.initializeTokenizer();

            // 检查文件是否存在
            if (!await fs.pathExists(srtFilePath)) {
                throw new Error(`SRT文件不存在: ${srtFilePath}`);
            }

            // 读取SRT文件
            const srtContent = await fs.readFile(srtFilePath, 'utf-8');

            // 解析SRT内容
            const entries = this.parseSRT(srtContent);
            if (entries.length === 0) {
                console.log('❌ 没有解析出任何条目！');
                return null;
            }

            // 构建词汇索引
            const vocabulary = this.buildVocabularyIndex(entries);
            if (Object.keys(vocabulary).length === 0) {
                console.log('❌ 没有提取出任何词汇！');
                return null;
            }

            // 添加JLPT等级信息
            const startTime = Date.now();
            const enrichedVocabulary = await this.enrichWithJLPTData(vocabulary, maxWorkers);
            const endTime = Date.now();

            console.log(`\n⏱️  查询耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);

            // 按JLPT等级排序
            const sortedVocabulary = this.sortVocabularyByJLPT(enrichedVocabulary);

            // 确保输出目录存在
            await fs.ensureDir(path.dirname(outputPath));

            // 保存到文件
            await fs.writeFile(outputPath, JSON.stringify(sortedVocabulary, null, 2), 'utf-8');

            console.log('\n✅ 处理完成！');
            console.log(`词汇数量: ${Object.keys(sortedVocabulary).length}`);
            console.log(`输出文件: ${outputPath}`);

            return sortedVocabulary;

        } catch (error) {
            console.log(`\n❌ 处理失败: ${error.message}`);
            throw error;
        }
    }
}

// 主函数
async function main() {
    if (process.argv.length < 3) {
        console.log('使用方法: node serifu.js <输入SRT文件> [并发数]');
        console.log('示例: node serifu.js ep8.srt 5');
        console.log('输出文件将自动生成到 ../obilivionis-site/public/data/ 目录');
        process.exit(1);
    }

    const srtFile = process.argv[2];
    const maxWorkers = parseInt(process.argv[3]) || 5;

    // 自动生成输出路径
    const baseName = path.basename(srtFile, path.extname(srtFile));
    const outputDir = '../obilivionis-site/public/data/BanG-Dream/MyGO/S1/Ep8';
    const outputFile = path.join(outputDir, `${baseName}.json`);

    // 检查网络连接
    try {
        const response = await axios.get('https://jlpt-vocab-api.vercel.app/api/words?word=test', { timeout: 5000 });
        console.log('✅ 网络连接正常，可以访问JLPT API');
    } catch (error) {
        console.log('❌ 网络连接异常，无法访问JLPT API');
        console.log('请检查网络连接后重试');
        process.exit(1);
    }

    const processor = new SRTProcessor();

    try {
        const result = await processor.processSRTFile(srtFile, outputFile, maxWorkers);
        if (result) {
            console.log(`\n🎉 成功处理！生成了 ${Object.keys(result).length} 个词汇条目`);
            console.log('词汇已按以下顺序排序: N0 → N1 → N2 → N3 → N4 → N5 → 未匹配');
            console.log(`使用了 ${maxWorkers} 个并发进行API查询`);
        } else {
            console.log('\n😞 处理失败，请检查输入文件');
        }
    } catch (error) {
        console.log(`\n💥 程序异常: ${error.message}`);
        process.exit(1);
    }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('serifu.js')) {
    main();
}

export default SRTProcessor;