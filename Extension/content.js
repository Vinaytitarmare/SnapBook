
// Nexus Content Script - Complete Platform Support

/**
 * Poll job status until complete or failed
 */
if (typeof pollJobStatus === 'undefined') {
    window.pollJobStatus = async function(jobId) {
        const SERVER_URL = "http://localhost:3001";
        const maxAttempts = 60; // 120 seconds max (60 * 2s)
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
                
                const statusRes = await fetch(`${SERVER_URL}/jobs/${jobId}`);
                if (!statusRes.ok) {
                    console.warn(`Nexus: Job status check failed (attempt ${i + 1})`);
                    continue;
                }
                
                const { state, result, reason } = await statusRes.json();
                
                if (state === 'completed') {
                    console.log('✅ Nexus: Memory saved successfully!', result);
                    return { success: true, result };
                } else if (state === 'failed') {
                    console.error('❌ Nexus: Processing failed -', reason);
                    return { success: false, error: reason };
                } else {
                    console.log(`⏳ Nexus: Processing... (${state})`);
                }
            } catch (error) {
                console.warn('Nexus: Polling error, retrying...', error.message);
            }
        }
        
        console.warn('⚠️ Nexus: Processing timed out. Check your dashboard.');
        return { success: false, error: 'Timeout' };
    };
}

/**
 * Main content extraction function
 */
if (typeof extractContent === 'undefined') {
    window.extractContent = async function() {
        const url = window.location.href;
        const platform = detectPlatform(url);
        
        console.log(`🔍 Nexus: Detected platform - ${platform}`);
        
        let extractedData = null;
        
        try {
            // Select appropriate extractor
            switch(platform) {
                case 'twitter':
                    extractedData = new TwitterExtractor().extract();
                    break;
                case 'instagram':
                    extractedData = new InstagramExtractor().extract();
                    break;
                case 'facebook':
                    extractedData = new FacebookExtractor().extract();
                    break;
                case 'youtube':
                    extractedData = new YouTubeExtractor().extract();
                    break;
                case 'tiktok':
                    extractedData = new TikTokExtractor().extract();
                    break;
                case 'linkedin':
                    extractedData = new LinkedInExtractor().extract();
                    break;
                case 'reddit':
                    extractedData = new RedditExtractor().extract();
                    break;
                default:
                    // Use article extractor with Readability
                    extractedData = new ArticleExtractor().extract();
            }
            
            console.log('📦 Nexus: Extracted data:', extractedData);
            
            await sendDataToBackend(extractedData);
            
        } catch (error) {
            console.error('❌ Nexus: Extraction failed', error);
            // Try fallback extraction
            try {
                const fallbackData = new ArticleExtractor().extract();
                await sendDataToBackend(fallbackData);
            } catch (fallbackError) {
                console.error('❌ Nexus: Fallback extraction also failed', fallbackError);
            }
        }
    };
}

/**
 * Convert extracted data to formatted text for backend
 */
if (typeof formatDataForBackend === 'undefined') {
    window.formatDataForBackend = function(data) {
        let formatted = `Platform: ${data.platform}\n`;
        formatted += `Type: ${data.type}\n`;
        formatted += `URL: ${data.url}\n`;
        formatted += `Captured: ${new Date().toLocaleString()}\n\n`;
        
        // Add separator
        formatted += '─'.repeat(50) + '\n\n';
        
        // Title
        if (data.title) {
            formatted += `📌 TITLE:\n${data.title}\n\n`;
        }
        
        // Author
        if (data.author) {
            const authorStr = typeof data.author === 'object' 
                ? `${data.author.name || data.author.username || 'Unknown'}${data.author.profileUrl ? ` (${data.author.profileUrl})` : ''}`
                : data.author;
            formatted += `👤 AUTHOR: ${authorStr}\n\n`;
        }
        
        // Channel (YouTube)
        if (data.channel) {
            formatted += `📺 CHANNEL: ${data.channel.name}${data.channel.url ? ` (${data.channel.url})` : ''}\n\n`;
        }
        
        // Subreddit (Reddit)
        if (data.subreddit) {
            formatted += `🔗 SUBREDDIT: r/${data.subreddit}\n\n`;
        }
        
        // Main content
        if (data.text) {
            formatted += `📄 CONTENT:\n${data.text}\n\n`;
        }
        
        if (data.caption) {
            formatted += `💬 CAPTION:\n${data.caption}\n\n`;
        }
        
        if (data.description) {
            formatted += `📝 DESCRIPTION:\n${data.description}\n\n`;
        }
        
        // Metadata
        if (data.hashtags && data.hashtags.length > 0) {
            formatted += `🏷️ HASHTAGS: ${data.hashtags.join(' ')}\n\n`;
        }
        
        if (data.mentions && data.mentions.length > 0) {
            formatted += `@️ MENTIONS: ${data.mentions.join(' ')}\n\n`;
        }
        
        if (data.tags && data.tags.length > 0) {
            formatted += `🔖 TAGS: ${data.tags.join(', ')}\n\n`;
        }
        
        if (data.music) {
            formatted += `🎵 MUSIC: ${data.music}\n\n`;
        }
        
        if (data.flair) {
            formatted += `🎯 FLAIR: ${data.flair}\n\n`;
        }
        
        // Timestamps
        if (data.postedAt || data.publishedAt || data.uploadDate) {
            const timestamp = data.postedAt || data.publishedAt || data.uploadDate;
            formatted += `📅 POSTED: ${timestamp}\n\n`;
        }
        
        // Engagement
        if (data.engagement) {
            formatted += `📊 ENGAGEMENT:\n`;
            Object.entries(data.engagement).forEach(([key, value]) => {
                formatted += `  ${key}: ${value}\n`;
            });
            formatted += '\n';
        }
        
        // Media
        if (data.videoUrl) {
            formatted += `🎥 VIDEO: ${data.videoUrl}\n`;
        }
        
        if (data.embedUrl) {
            formatted += `🔗 EMBED: ${data.embedUrl}\n`;
        }
        
        if (data.images && data.images.length > 0) {
            formatted += `🖼️ IMAGES (${data.images.length}):\n`;
            data.images.slice(0, 5).forEach((img, i) => {
                formatted += `  ${i + 1}. ${img}\n`;
            });
            if (data.images.length > 5) {
                formatted += `  ... and ${data.images.length - 5} more\n`;
            }
            formatted += '\n';
        }
        
        if (data.media && data.media.length > 0) {
            formatted += `📎 MEDIA (${data.media.length}):\n`;
            data.media.forEach((m, i) => {
                formatted += `  ${i + 1}. [${m.type}] ${m.url}\n`;
            });
            formatted += '\n';
        }
        
        if (data.externalUrl) {
            formatted += `🔗 EXTERNAL LINK: ${data.externalUrl}\n\n`;
        }
        
        // Additional metadata
        if (data.category) {
            formatted += `📂 CATEGORY: ${data.category}\n\n`;
        }
        
        if (data.siteName) {
            formatted += `🌐 SITE: ${data.siteName}\n\n`;
        }
        
        return formatted;
    };
}

/**
 * Send extracted data to backend
 */
if (typeof sendDataToBackend === 'undefined') {
    window.sendDataToBackend = async function(data) {
        const SERVER_URL = "http://localhost:3001/receive_data?source=W";

        const rawTextToSend = formatDataForBackend(data);
        
        console.log("--- Sending to Nexus Backend ---");
        
        try {
            const response = await fetch(SERVER_URL, {
                method: "POST",
                headers: { 
                    "Content-Type": "text/plain"
                },
                body: rawTextToSend
            });
            
            if (response.status === 202) {
                // Queued - start polling
                const { jobId } = await response.json();
                console.log(`📋 Nexus: Job queued (ID: ${jobId}). Tracking progress...`);
                
                await pollJobStatus(jobId);
            } else if (response.status === 200) {
                console.log("✅ Nexus: Saved successfully!");
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error("❌ Nexus Error:", response.status, errorData.error);
            }

        } catch (error) {
            console.error("❌ Nexus Connection Failed:", error);
        }
    };
}

// Run extraction when page is loaded
// Wait a bit for dynamic content to load
setTimeout(() => {
    extractContent();
}, 1000);
