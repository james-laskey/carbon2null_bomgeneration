import 'dotenv/config';
import fs from 'fs';
import { fetch } from 'undici';

// Configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const INPUT_JSON_FILE = 'most_common_medical_devices.js';
const OUTPUT_JSON_FILE = 'research_boms_output.json';
const REFERENCE_BOMS_FILE = 'boms_output.json';

// Debug setup
const DEBUG = true;
function debugLog(...args) {
    if (DEBUG) console.log('[DEBUG]', ...args);
}

// Load existing BOMs for cross-referencing
let existingBOMs = [];
try {
    existingBOMs = JSON.parse(fs.readFileSync(REFERENCE_BOMS_FILE, 'utf-8'));
    debugLog(`Loaded ${existingBOMs.length} existing BOMs`);
} catch (error) {
    console.warn('No existing BOMs found for reference, starting fresh');
}

// Enhanced fetch with timeout and retries
async function robustFetch(url, options, timeout = 30000, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            debugLog(`Attempt ${i + 1}: Sending request to ${url}`);
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            debugLog(`Attempt ${i + 1} failed:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

async function getBOMFromDeepSeek(productName, index) {
    const cleanProductName = productName.replace(/[^\w\s-]/g, '');
    
    // Get the existing BOM at the same index if it exists
    const existingBOM = existingBOMs[index] || null;
    
    // Your requested message format
    const messages = [{
        role: "system",
        content: "You are a medical device manufacturing expert that creates accurate bills of materials (BOMs). " +
                 "When provided with an existing BOM, use it to improve your response."
    }, {
        role: "user",
        content: `Create or update a bill of materials for a ${cleanProductName} using this exact JSON format:
        {
            "product_name": "${cleanProductName}",
            "manufacturer": "",
            "product_origin": "",
            "ingredients": [],
            "components": []
        }
        
        ${existingBOM ? `Here is the existing BOM for this product (index ${index}):\n${JSON.stringify(existingBOM, null, 2)}` : 'No existing BOM found for this product index'}
        
        Guidelines:
        1. ${existingBOM ? 'Improve upon the existing BOM' : 'Create a new detailed BOM'}
        2. For each component/ingredient, specify:
           - material type
           - quantity or percentage
           - purpose/function
        3. Only return valid JSON, no additional commentary`
    }];

    const requestBody = {
        model: "deepseek-reasoner",
        messages,
        temperature: 0.3,
        max_tokens: 2000,
    };

    try {
        debugLog(`Sending request for ${cleanProductName} (index ${index})`);
        
        const response = await robustFetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }, 30000);

        debugLog(`Received response for ${cleanProductName}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const responseData = await response.json();
        let content = responseData.choices?.[0]?.message?.content;
        
        // Clean and parse response
        content = content.replace(/```json|```/g, '').trim();
        const bomData = JSON.parse(content);
        
        return {
            ...bomData,
            product_name: bomData.product_name || cleanProductName,
            previous_bom_index: index,
            updated_at: new Date().toISOString()
        };
        
    } catch (error) {
        debugLog(`Error for ${cleanProductName}:`, error);
        return {
            product_name: cleanProductName,
            previous_bom_index: index,
            error: error.message,
            updated_at: new Date().toISOString()
        };
    }
}

async function generateBOMsForProducts() {
    try {
        if (!fs.existsSync(INPUT_JSON_FILE)) {
            throw new Error(`Input file not found: ${INPUT_JSON_FILE}`);
        }

        const productsData = JSON.parse(fs.readFileSync(INPUT_JSON_FILE, 'utf-8'));
        
        if (!Array.isArray(productsData)) {
            throw new Error("Input data must be an array");
        }

        console.log(`Starting processing of ${productsData.length} products...`);
        
        const results = [];
        for (let i = 0; i < productsData.length; i++) {
            const product = productsData[i];
            if (!product?.product_name) {
                results.push({
                    index: i,
                    error: "Missing product_name"
                });
                continue;
            }

            try {
                debugLog(`Processing item ${i}: ${product.product_name}`);
                const bom = await getBOMFromDeepSeek(product.product_name, i);
                results.push(bom);
                
                if ((i + 1) % 5 === 0) {
                    fs.writeFileSync(OUTPUT_JSON_FILE, JSON.stringify(results, null, 2));
                    console.log(`Saved ${i + 1}/${productsData.length} items`);
                }
                
                await new Promise(r => {
                    const waitTime = 500;
                    debugLog(`Waiting ${waitTime}ms before next request...`);
                    setTimeout(r, waitTime);
                });
                
            } catch (error) {
                console.error(`Error processing index ${i}:`, error.message);
                results.push({
                    index: i,
                    product_name: product.product_name,
                    error: error.message
                });
            }
        }
        
        fs.writeFileSync(OUTPUT_JSON_FILE, JSON.stringify(results, null, 2));
        console.log(`Completed processing. Results saved to ${OUTPUT_JSON_FILE}`);
        
    } catch (error) {
        console.error("Fatal error:", error.message);
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason) => {
    debugLog('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    debugLog('Uncaught Exception:', error);
});

generateBOMsForProducts();