import 'dotenv/config';
import fs from 'fs';

// Configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const INPUT_JSON_FILE = 'most_common_medical_devices.json';
const OUTPUT_JSON_FILE = 'boms_output.json';

// Enhanced debug logger
function debugLog(title, data) {
    console.log(`\n===== ${title} =====`);
    console.dir(data, { depth: null, colors: true });
    console.log('='.repeat(20 + title.length), '\n');
}

async function getBOMFromDeepSeek(productName) {
    const cleanProductName = productName.replace(/[^\w\s-]/g, '');
    
    const messages = [{
        role: "user",
        content: `Provide a bill of materials for ${cleanProductName} in this exact JSON format:
        boms = {
    'product_name': "${cleanProductName}",
    "manufacturer": "",
    "product_origin": "",
    "ingredients": [
        {
          "ingredient1":{},
          "ingredient2":{}
            }
        ],
    "components":[{
          "component1":{},
          "component2":{}
            }
        ]
    }
        if there are multiple components or ingredients, please add them in the same format as above.`
    }];

    const requestBody = {
        model: "deepseek-chat",
        messages,
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: "json_object" }
    };

    // Debug the request before sending
    debugLog('OUTGOING REQUEST', {
        url: DEEPSEEK_API_URL,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY.trim()}`,
            'Content-Type': 'application/json'
        },
        body: requestBody
    });

    try {
        const startTime = Date.now();
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseTime = Date.now() - startTime;
        const responseData = await response.json();

        // Debug the raw response
        debugLog('RAW API RESPONSE', {
            status: response.status,
            statusText: response.statusText,
            responseTime: `${responseTime}ms`,
            data: responseData
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(responseData)}`);
        }

        let content = responseData.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("Empty response content from API");
        }

        // Clean and parse response
        content = content.replace(/```json|```/g, '').trim();
        const bomData = JSON.parse(content);

        return {
            ...bomData,
            product_name: bomData.product_name || cleanProductName
        };

    } catch (error) {
        debugLog('API ERROR DETAILS', {
            product: cleanProductName,
            error: error.message,
            stack: error.stack
        });

        return {
            product_name: cleanProductName,
            error: "API request failed",
            details: error.message
        };
    }
}

async function generateBOMsForProducts() {
    try {
        const productsData = JSON.parse(fs.readFileSync(INPUT_JSON_FILE, 'utf-8'));
        
        if (!Array.isArray(productsData)) {
            throw new Error("Input JSON should be an array of products");
        }

        console.log(`Processing ${productsData.length} products...`);
        
        const results = [];
        for (const product of productsData) {
            if (!product.product_name) {
                console.warn("Skipping product with no product_name property:", product);
                continue;
            }
            
            const bom = await getBOMFromDeepSeek(product.product_name);
            results.push(bom);
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        fs.writeFileSync(OUTPUT_JSON_FILE, JSON.stringify(results, null, 2));
        console.log(`Successfully saved BOMs to ${OUTPUT_JSON_FILE}`);
        
        return results;
    } catch (error) {
        console.error("Error in generateBOMsForProducts:", error);
        throw error;
    }
}

// Run the script
generateBOMsForProducts()
    .then(() => console.log("BOM generation completed"))
    .catch(err => console.error("Script failed:", err));