// Import the Google Generative AI library
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize the Gemini API client
let geminiModel: any = null;

/**
 * Initialize the Gemini client with the API key
 * @param apiKey - The Gemini API key
 * @returns A promise resolving to boolean indicating success
 */
export const initGeminiClient = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) {
    console.error('Gemini API key is required');
    return false;
  }

  try {
    console.log('Initializing Gemini client with API key...');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Try multiple models in order of preference (fast to standard)
    const modelOptions = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite"
    ];

    let modelInitialized = false;
    let lastError: any = null;

    for (const modelName of modelOptions) {
      try {
        console.log(`Attempting to initialize model: ${modelName}`);

        // Check connectivity with a simple ping request
        const pingModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: 10,
          },
        });

        // Try a simple ping to verify connectivity
        const pingPromise = pingModel.generateContent("test")
          .then(result => {
            const text = result.response.text();
            console.log(`${modelName} API connectivity test successful:`, text);
            return text && text.length > 0;
          })
          .catch(error => {
            console.error(`${modelName} API connectivity test failed:`, error);
            throw error;
          });

        // Set a timeout for the ping test
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`${modelName} API connectivity test timed out`)), 8000);
        });

        // Race the ping against the timeout
        await Promise.race([pingPromise, timeoutPromise]);

        // If we get here, the ping was successful, so initialize the full model
        geminiModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.4,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
        });

        console.log(`Gemini client initialized successfully with model: ${modelName}`);
        modelInitialized = true;
        break;
      } catch (error) {
        console.warn(`Failed to initialize ${modelName}:`, error);
        lastError = error;
        continue;
      }
    }

    if (!modelInitialized) {
      throw lastError || new Error('All Gemini models failed to initialize');
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    geminiModel = null;
    return false;
  }
};

/**
 * Generate text response using Gemini AI
 * @param prompt - The text prompt to send to Gemini
 * @param options - Additional options for generation
 * @returns The generated response text
 */
export const generateTextResponse = async (
  prompt: string,
  options: {
    maxRetries?: number;
    timeout?: number;
    temperature?: number;
  } = {}
): Promise<string> => {
  const {
    maxRetries = 0, // Default to no retries to avoid rate limiting
    timeout = 8000, // Much shorter default timeout - 8 seconds
    temperature = 0.2, // Lower temperature for more consistent output
  } = options;

  if (!geminiModel) {
    console.error('Gemini client not initialized');
    return 'Error: AI service not available. Please try again later.';
  }

  console.log('Generating text response for prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Gemini API request timed out after ${timeout}ms`));
    }, timeout);
  });

  let lastError: any = null;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      // Race the API call against the timeout
      const generatePromise = async () => {
        // Use minimal generation config for faster response
        const result = await geminiModel.generateContent(prompt, {
          generationConfig: {
            temperature: temperature,
            topP: 0.9, // Slightly higher for variety but still focused
            topK: 20, // Reduced from 40 for faster processing
            maxOutputTokens: 1024, // Reduced from 2048 for faster response
            candidateCount: 1, // Only generate one candidate
          },
        });

        const response = result.response;
        const text = response.text();

        // Verify we got a meaningful response
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini API');
        }

        console.log('Successfully generated response with length:', text.length);
        return text;
      };

      // Race against timeout
      return await Promise.race([generatePromise(), timeoutPromise]);
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${retryCount + 1}/${maxRetries + 1} failed:`, error);

      if (error.message) {
        console.error('Error message:', error.message);
      }

      // Check for specific error types
      if (error.message?.includes('safety')) {
        console.warn('Content filtered due to safety settings');
        return 'I cannot provide a response to that query due to content safety restrictions. Please try asking something else.';
      }

      // If this was our last retry, throw the error
      if (retryCount >= maxRetries) {
        break;
      }

      // Exponential backoff before retry
      const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      retryCount++;
    }
  }

  console.error('All retries failed:', lastError);

  // Provide a helpful error message based on the type of error
  if (lastError?.message?.includes('timed out')) {
    return 'Sorry, the AI service took too long to respond. Please try again later with a simpler request.';
  } else if (lastError?.message?.includes('network') || lastError?.name === 'TypeError') {
    return 'Sorry, there seems to be a network issue. Please check your internet connection and try again.';
  } else if (lastError?.message?.includes('invalid') || lastError?.message?.includes('safety')) {
    return 'Your request could not be processed due to content restrictions or invalid input. Please modify your request and try again.';
  }

  return 'Sorry, I encountered an error processing your request. Please try again later.';
};

/**
 * Analyze an image using Gemini AI
 * @param imageData - The base64 encoded image data
 * @param prompt - Additional text prompt to guide the analysis
 * @returns The analysis result as text
 */
export const analyzeImage = async (imageData: string, prompt: string): Promise<string> => {
  if (!geminiModel) {
    console.error('Gemini client not initialized');
    return 'Error: AI service not available. Please try again later.';
  }

  try {
    console.log('Analyzing image with prompt:', prompt);

    // Remove the data URL prefix if present
    let base64Image = imageData;
    let mimeType = 'image/jpeg';

    if (imageData.includes('data:')) {
      const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Image = matches[2];
      } else {
        base64Image = imageData.split('base64,')[1] || imageData;
      }
    }

    console.log(`Processing image with MIME type: ${mimeType}`);

    // Create the content parts with image and text
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      }
    };

    // Combine image and prompt for multimodal input
    const result = await geminiModel.generateContent([imagePart, prompt]);
    const response = result.response;
    const text = response.text();

    console.log('Successfully analyzed image, response length:', text.length);
    return text;
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    return 'Sorry, I encountered an error analyzing your image. Please try again.';
  }
};

/**
 * Analyze soil from image
 * @param imageData - Base64 encoded image data
 * @returns Soil analysis result
 */
export const analyzeSoil = async (imageData: string): Promise<any> => {
  if (!geminiModel) {
    console.error('Gemini client not initialized');
    return {
      soilPresent: false,
      soilType: 'Service not available',
      fertility: 'Medium',
      phLevel: '7.0',
      recommendations: 'Please try again later or refresh the page.',
      suitableCrops: ['Service unavailable'],
      confidenceScore: 0,
      nutrients: { nitrogen: 0, phosphorus: 0, potassium: 0, organicMatter: 0, sulfur: 0 },
      properties: { ph: 7.0, texture: 'Unknown', waterRetention: 0, drainage: 'Unknown' }
    };
  }

  const prompt = `
    Analyze this soil image and provide detailed soil analysis. If no soil is visible, set soilPresent to false.
    
    You are a professional soil scientist. Examine the soil in the image and provide a comprehensive assessment based on what you observe.
    
    Analyze the soil's:
    - Color, texture, and composition
    - Visible organic matter content
    - Moisture levels and drainage characteristics
    - Overall fertility indicators
    - Suitable crops for this soil type
    
    Return your analysis in this JSON format with NO additional text:
    {
      "soilPresent": true/false,
      "soilType": "actual soil type you observe",
      "fertility": "Low/Medium/High based on visual indicators",
      "phLevel": "estimated pH range",
      "recommendations": "specific recommendations based on your analysis",
      "suitableCrops": ["crops suitable for this specific soil"],
      "confidenceScore": confidence_number_1_to_10,
      "nutrients": {
        "nitrogen": estimated_percentage,
        "phosphorus": estimated_percentage,
        "potassium": estimated_percentage,
        "organicMatter": estimated_percentage,
        "sulfur": estimated_percentage
      },
      "properties": {
        "ph": estimated_ph_number,
        "texture": "observed texture",
        "waterRetention": estimated_percentage,
        "drainage": "Poor/Moderate/Good"
      }
    }
    
    Base your analysis on what you actually see in the image. Do not use generic values.
  `;

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Soil analysis attempt ${retryCount + 1}/${maxRetries + 1}`);

      const mimeType = imageData.startsWith('data:image/png') ? 'image/png' :
        imageData.startsWith('data:image/jpeg') ? 'image/jpeg' :
          imageData.startsWith('data:image/jpg') ? 'image/jpeg' : 'image/png';

      const imagePart = {
        inlineData: {
          data: imageData.split(',')[1],
          mimeType: mimeType
        }
      };

      const result = await geminiModel.generateContent([prompt, imagePart], {
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });

      const response = result.response;
      let text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      console.log('Soil analysis response length:', text.length);

      // Clean up the response
      text = text.trim();
      text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      text = text.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      // Find JSON object boundaries
      const startIndex = text.indexOf('{');
      const lastIndex = text.lastIndexOf('}');

      if (startIndex === -1 || lastIndex === -1 || startIndex >= lastIndex) {
        throw new Error('No valid JSON object found in response');
      }

      // Extract the JSON part
      const jsonText = text.substring(startIndex, lastIndex + 1);

      // Validate basic JSON structure
      if (!jsonText.includes('"soilPresent"') || !jsonText.includes('"soilType"')) {
        throw new Error('Response missing required soil fields');
      }

      // Parse and validate
      const analysisResult = JSON.parse(jsonText);

      // Validate required fields
      if (typeof analysisResult.soilPresent !== 'boolean') {
        throw new Error('Invalid soil analysis structure');
      }

      // Normalize and validate fields
      const validatedResult = {
        soilPresent: Boolean(analysisResult.soilPresent),
        soilType: String(analysisResult.soilType || 'Loamy Soil').trim(),
        fertility: ['Low', 'Medium', 'High'].includes(analysisResult.fertility) ? analysisResult.fertility : 'Medium',
        phLevel: String(analysisResult.phLevel || '6.5-7.0').trim(),
        recommendations: String(analysisResult.recommendations || 'Regular soil testing recommended for optimal crop management.').trim(),
        suitableCrops: Array.isArray(analysisResult.suitableCrops) ? analysisResult.suitableCrops : ['wheat', 'corn', 'rice'],
        confidenceScore: Math.max(1, Math.min(10, Number(analysisResult.confidenceScore) || 6)),
        nutrients: {
          nitrogen: Math.max(0, Math.min(100, Number(analysisResult.nutrients?.nitrogen) || 35)),
          phosphorus: Math.max(0, Math.min(100, Number(analysisResult.nutrients?.phosphorus) || 28)),
          potassium: Math.max(0, Math.min(100, Number(analysisResult.nutrients?.potassium) || 42)),
          organicMatter: Math.max(0, Math.min(100, Number(analysisResult.nutrients?.organicMatter) || 15)),
          sulfur: Math.max(0, Math.min(100, Number(analysisResult.nutrients?.sulfur) || 10))
        },
        properties: {
          ph: Math.max(0, Math.min(14, Number(analysisResult.properties?.ph) || 6.8)),
          texture: String(analysisResult.properties?.texture || 'Loamy').trim(),
          waterRetention: Math.max(0, Math.min(100, Number(analysisResult.properties?.waterRetention) || 65)),
          drainage: ['Poor', 'Moderate', 'Good'].includes(analysisResult.properties?.drainage) ? analysisResult.properties.drainage : 'Good'
        }
      };

      console.log('Soil analysis completed successfully:', validatedResult.soilType);
      return validatedResult;

    } catch (error: any) {
      console.error(`Soil analysis attempt ${retryCount + 1} failed:`, error.message);

      if (retryCount >= maxRetries) {
        console.error('All soil analysis attempts failed');

        // Handle specific API errors
        let fallbackReason = 'Analysis Failed - Please Try Again';
        let fallbackRecommendations = 'Unable to analyze soil image. Please try again with a clearer image showing soil surface.';

        if (error.message && error.message.includes('429')) {
          fallbackReason = 'API Quota Exceeded';
          fallbackRecommendations = 'Daily API limit reached. Please try again later or upgrade your plan for unlimited analysis.';
          console.warn('Gemini API quota exceeded - consider upgrading plan or waiting for quota reset');
        } else if (error.message && error.message.includes('timeout')) {
          fallbackReason = 'Analysis Timeout';
          fallbackRecommendations = 'Analysis took too long. Please try again with a smaller or clearer image.';
        } else if (error.message && error.message.includes('safety')) {
          fallbackReason = 'Content Safety Issue';
          fallbackRecommendations = 'Image content was flagged. Please ensure the image shows only soil and try again.';
        }

        return {
          soilPresent: true,
          soilType: fallbackReason,
          fertility: 'Medium',
          phLevel: '6.5-7.0',
          recommendations: fallbackRecommendations,
          suitableCrops: ['wheat', 'corn', 'rice', 'soybeans'],
          confidenceScore: 3,
          nutrients: { nitrogen: 30, phosphorus: 25, potassium: 35, organicMatter: 12, sulfur: 8 },
          properties: { ph: 6.8, texture: 'Unknown', waterRetention: 50, drainage: 'Moderate' }
        };
      }

      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
};

/**
 * Analyze crop disease from an image
 * @param imageData - The base64 encoded image data
 * @returns Structured analysis of crop disease
 */
export const analyzeCropDisease = async (imageData: string): Promise<{
  disease: string;
  confidence: number;
  treatment: string;
  severity: 'Low' | 'Medium' | 'High';
  details: string;
}> => {
  if (!geminiModel) {
    console.error('Gemini client not initialized');
    return {
      disease: 'Service not available',
      confidence: 0,
      treatment: 'Please try again later or refresh the page.',
      severity: 'Medium',
      details: 'AI service is not properly initialized.'
    };
  }

  const prompt = `
    Analyze this plant image and identify any disease or condition affecting the plant.
    
    You are a professional plant pathologist. Provide a comprehensive assessment in JSON format ONLY.
    
    Return this exact JSON structure with NO additional text or formatting:
    {
      "disease": "Specific disease name",
      "confidence": 85,
      "treatment": "Detailed treatment recommendations",
      "severity": "Low",
      "details": "Disease description and symptoms"
    }
    
    Rules:
    - confidence: number between 0-100
    - severity: must be exactly "Low", "Medium", or "High"
    - Keep treatment and details concise but informative
    - NO markdown, NO code blocks, NO extra text
    - Return ONLY the JSON object
  `;

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Disease analysis attempt ${retryCount + 1}/${maxRetries + 1}`);

      const mimeType = imageData.startsWith('data:image/png') ? 'image/png' :
        imageData.startsWith('data:image/jpeg') ? 'image/jpeg' :
          imageData.startsWith('data:image/jpg') ? 'image/jpeg' : 'image/png';

      const imagePart = {
        inlineData: {
          data: imageData.split(',')[1],
          mimeType: mimeType
        }
      };

      const result = await geminiModel.generateContent([prompt, imagePart], {
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });

      const response = result.response;
      let text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      console.log('Raw response length:', text.length);

      // Clean up the response
      text = text.trim();

      // Remove any markdown formatting
      text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      text = text.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      // Find JSON object boundaries
      const startIndex = text.indexOf('{');
      const lastIndex = text.lastIndexOf('}');

      if (startIndex === -1 || lastIndex === -1 || startIndex >= lastIndex) {
        throw new Error('No valid JSON object found in response');
      }

      // Extract the JSON part
      const jsonText = text.substring(startIndex, lastIndex + 1);

      // Validate basic JSON structure
      if (!jsonText.includes('"disease"') || !jsonText.includes('"confidence"')) {
        throw new Error('Response missing required fields');
      }

      // Parse and validate
      const analysisResult = JSON.parse(jsonText);

      // Validate required fields
      if (!analysisResult.disease || typeof analysisResult.confidence !== 'number') {
        throw new Error('Invalid response structure');
      }

      // Normalize and validate fields
      const validatedResult = {
        disease: String(analysisResult.disease).trim(),
        confidence: Math.max(0, Math.min(100, Number(analysisResult.confidence) || 50)),
        treatment: String(analysisResult.treatment || 'Consult with agricultural expert for treatment recommendations.').trim(),
        severity: ['Low', 'Medium', 'High'].includes(analysisResult.severity) ? analysisResult.severity : 'Medium',
        details: String(analysisResult.details || 'Disease analysis completed.').trim()
      };

      console.log('Disease analysis completed successfully:', validatedResult.disease);
      return validatedResult;

    } catch (error: any) {
      console.error(`Attempt ${retryCount + 1} failed:`, error.message);

      if (retryCount >= maxRetries) {
        console.error('All disease analysis attempts failed');
        return {
          disease: 'Analysis Failed',
          confidence: 0,
          treatment: 'Unable to analyze the image. Please try again with a clearer image showing plant symptoms.',
          severity: 'Medium',
          details: 'The AI analysis could not be completed. This may be due to image quality, lighting, or service limitations.'
        };
      }

      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
};

/**
 * Analyze an image for pest detection and recommendations
 * @param imageData - Base64 encoded image data
 * @param language - Language code (en, te, hi)
 * @returns Analysis results with pest information and recommendations
 */
export const analyzePestImage = async (imageData: string, language: string = 'en'): Promise<{
  pestType: string;
  pesticideRecommendations: string;
  organicAlternatives: string;
  preventionTips: string;
  severity: 'Low' | 'Medium' | 'High';
}> => {
  // Define language instructions based on the language code
  const languageInstructions = {
    en: 'Analyze in English and provide response in English.',
    te: 'Analyze in English but provide response in Telugu (తెలుగు).',
    hi: 'Analyze in English but provide response in Hindi (हिंदी).'
  };

  // Get the language instruction or default to English
  const languageInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;

  const prompt = `
    Analyze this crop/plant image and identify any pests or pest damage.
    Provide detailed information about:
    1. Type of pest or pest damage identified
    2. Recommended pesticides or treatments
    3. Organic/natural alternatives to chemical pesticides
    4. Prevention tips to avoid future infestations
    5. Severity of the infestation (Low, Medium, or High)
    
    ${languageInstruction}
    
    Format your response EXACTLY as JSON with the following structure:
    {
      "pestType": "Type of pest or 'None detected' if no pests found",
      "pesticideRecommendations": "Detailed pesticide recommendations",
      "organicAlternatives": "Natural/organic treatment alternatives",
      "preventionTips": "Tips to prevent future infestations",
      "severity": "Low", "Medium", or "High"
    }
    
    Only return the JSON object, nothing else. Do not include any markdown formatting or code blocks.
  `;

  try {
    const result = await analyzeImage(imageData, prompt);
    console.log('Raw pesticide analysis response:', result);

    // Clean up the response to handle potential formatting issues
    const cleanedResult = result.replace(/```json|```/g, '').trim();

    // Parse the JSON response
    try {
      const parsedResult = JSON.parse(cleanedResult);

      // Normalize severity to one of the accepted values
      let severity: 'Low' | 'Medium' | 'High' = 'Medium';
      if (parsedResult.severity) {
        const severityStr = parsedResult.severity.toString().trim().toLowerCase();
        if (severityStr === 'low') severity = 'Low';
        else if (severityStr === 'high') severity = 'High';
        else severity = 'Medium';
      }

      return {
        pestType: parsedResult.pestType || 'Unknown',
        pesticideRecommendations: parsedResult.pesticideRecommendations || 'No specific recommendations available',
        organicAlternatives: parsedResult.organicAlternatives || 'No organic alternatives provided',
        preventionTips: parsedResult.preventionTips || 'No prevention tips available',
        severity
      };
    } catch (parseError) {
      console.error('Error parsing pesticide analysis response:', parseError);
      console.error('Raw response:', result);

      // Try to extract information from non-JSON response
      const pestTypeMatch = result.match(/pest\s*type[:\s]+([^\n.,]+)/i);
      const recommendationsMatch = result.match(/pesticide\s*recommendations[:\s]+([^\n]+)/i);
      const organicMatch = result.match(/organic\s*alternatives[:\s]+([^\n]+)/i);
      const preventionMatch = result.match(/prevention\s*tips[:\s]+([^\n]+)/i);
      const severityMatch = result.match(/severity[:\s]+(Low|Medium|High)/i);

      // Fallback with extracted values if possible
      return {
        pestType: pestTypeMatch ? pestTypeMatch[1].trim() : 'Analysis Error',
        pesticideRecommendations: recommendationsMatch ? recommendationsMatch[1].trim() : 'Please analyze the image again for specific pesticide recommendations.',
        organicAlternatives: organicMatch ? organicMatch[1].trim() : 'Please analyze the image again for organic alternatives.',
        preventionTips: preventionMatch ? preventionMatch[1].trim() : 'Regular crop monitoring is recommended.',
        severity: (severityMatch ? severityMatch[1] as 'Low' | 'Medium' | 'High' : 'Medium')
      };
    }
  } catch (error) {
    console.error('Error in pesticide analysis:', error);

    // Return a response indicating analysis failure
    return {
      pestType: 'Analysis Failed',
      pesticideRecommendations: 'Please try again with a clearer image or contact agricultural support for in-person diagnosis.',
      organicAlternatives: 'Please try again with a clearer image or contact agricultural support for in-person diagnosis.',
      preventionTips: 'Regular crop monitoring is recommended.',
      severity: 'Medium'
    };
  }
};

/**
 * Get personalized farming recommendations
 * @param userProfile - User profile information
 * @param query - User's specific query
 * @param language - Language code (en, te, hi)
 * @returns Personalized recommendation
 */
export const getFarmingRecommendation = async (
  userProfile: {
    location?: string;
    farmType?: string;
    crops?: string[];
    soilType?: string;
  },
  query?: string,
  language: string = 'en'
): Promise<string> => {
  if (!geminiModel) {
    console.error('Gemini client not initialized');
    if (language === 'te') {
      return 'సేవ అందుబాటులో లేదు. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి లేదా పేజీని రిఫ్రెష్ చేయండి.';
    } else if (language === 'hi') {
      return 'सेवा उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें या पृष्ठ को रीफ्रेश करें।';
    } else {
      return 'Service not available. Please try again later or refresh the page.';
    }
  }

  // Define language instructions based on the language code
  const languageInstructions = {
    en: 'Respond in English.',
    te: 'Respond in Telugu (తెలుగు).',
    hi: 'Respond in Hindi (हिंदी).'
  };

  // Get the language instruction or default to English
  const languageInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;

  console.log(`Getting farming recommendation in language: ${language}`);
  console.log('User profile:', JSON.stringify(userProfile));
  console.log('Query:', query);

  const promptContext = `
    You are an expert agricultural consultant. Analyze the following farm profile and provide personalized farming advice.
    
    User Profile:
    - Location: ${userProfile.location || 'Unknown'}
    - Farm Type: ${userProfile.farmType || 'General farming'}
    - Main Crops: ${userProfile.crops?.join(', ') || 'Not specified'}
    - Soil Type: ${userProfile.soilType || 'Not specified'}
    
    ${query ? `Specific Question: ${query}` : 'Provide general farming recommendations for this profile.'}
    
    Based on this specific profile, provide personalized farming advice that considers:
    - The specific location and climate conditions
    - The mentioned soil type and its characteristics
    - The current crops and potential crop rotation benefits
    - The farm type and scale of operations
    - Seasonal considerations for the location
    - Water management strategies
    - Pest and disease prevention specific to the crops and region
    
    Focus on actionable recommendations that are specific to the user's context.
    Keep your response concise but informative, around 2-3 paragraphs maximum.
    
    If the user is asking about app navigation or app features, provide guidance on the following sections:
    - Dashboard: Main overview with weather, soil health, and crop status
    - Farm: View and manage farm details and agricultural activities
    - SoilLab: Analyze soil samples and get recommendations 
    - CropAdvisor: Get specific advice for different crops
    - Weather: Detailed weather forecasts and agricultural impact
    - Market: Market prices, trends, and selling opportunities
    - Profile: User profile management and settings
    
    ${languageInstruction}
  `;

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Farming recommendation attempt ${retryCount + 1}/${maxRetries + 1}`);

      const result = await geminiModel.generateContent(promptContext, {
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });

      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      console.log('Successfully generated farming recommendation, length:', text.length);
      return text.trim();

    } catch (error: any) {
      console.error(`Farming recommendation attempt ${retryCount + 1} failed:`, error.message);

      if (retryCount >= maxRetries) {
        console.error('All farming recommendation attempts failed');

        // Provide error messages in the appropriate language
        if (language === 'te') {
          return 'క్షమించండి, ప్రస్తుతం వ్యక్తిగతీకరించిన సిఫార్సును రూపొందించడం సాధ్యం కాలేదు. దయచేసి తర్వాత మళ్లీ ప్రయత్నించండి.';
        } else if (language === 'hi') {
          return 'मैं क्षमा चाहता हूं, लेकिन मैं इस समय एक वैयक्तिकृत अनुशंसा उत्पन्न करने में असमर्थ था। कृपया बाद में पुन: प्रयास करें।';
        } else {
          return 'I apologize, but I was unable to generate a personalized recommendation at this time. Please try again later.';
        }
      }

      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
};

/**
 * Analyze a farm image using Gemini AI to provide detailed insights about farm health
 * @param imageData - The base64 encoded image data
 * @param farmDetails - Optional farm details to provide context
 * @param customPrompt - Optional custom prompt to override the default analysis prompt
 * @returns Structured analysis of the farm
 */
export async function analyzeFarmImage(
  imageData: string,
  farmDetails: any,
  customPrompt?: string
): Promise<any> {
  try {
    if (!geminiModel) {
      console.error("Gemini model not initialized");
      throw new Error("Gemini model not initialized");
    }

    const prompt = customPrompt || `Analyze this farm image and provide a detailed assessment in JSON format.
    Farm details:
    - Name: ${farmDetails.name}
    - Location: ${farmDetails.location}
    - Size: ${farmDetails.size} acres
    - Type: ${farmDetails.farmType}
    - Soil: ${farmDetails.soilType}
    - Crops: ${farmDetails.crops.join(', ')}
    - Irrigation: ${farmDetails.irrigationSystem}
    
    Provide a comprehensive analysis with the following structure:
    {
      "soilHealth": <number between 1-100>,
      "cropHealth": <number between 1-100>,
      "waterManagement": <number between 1-100>,
      "pestRisk": <number between 1-100>,
      "overallScore": <number between 1-100>,
      "recommendations": [<array of 3-5 actionable recommendations>],
      "suitableCrops": [<array of suitable crops based on soil and climate>],
      "recommendedCrops": [<array of recommended crops for optimal yield>],
      "irrigationRecommendations": {
        "system": "<current system assessment>",
        "waterRequirement": <estimated water requirement in gallons per acre per day>,
        "schedule": "<recommended watering schedule>",
        "efficiency": <efficiency rating 1-100>,
        "optimalSystem": "<recommended irrigation system if different>",
        "wateringFrequency": "<how often to water>",
        "waterAmount": "<amount of water recommended>",
        "techniques": [<specific irrigation techniques>]
      },
      "soilAnalysis": {
        "type": "<soil type identification>",
        "fertility": "<fertility level>",
        "phLevel": <estimated pH level>,
        "organicMatter": <percentage of organic matter>,
        "texture": "<soil texture description>",
        "problems": [<detected soil issues>],
        "improvementSuggestions": [<ways to improve soil>]
      },
      "cropAnalysis": {
        "growthStage": "<current growth stage>",
        "healthIndicators": [<observed health indicators>],
        "nutrientDeficiencies": [<detected deficiencies>],
        "estimatedYield": "<yield prediction>",
        "harvestTime": "<estimated time to harvest>"
      },
      "sustainabilityScore": <sustainability rating 1-100>,
      "carbonFootprint": {
        "rating": "<low/medium/high>",
        "recommendations": [<ways to reduce carbon footprint>]
      },
      "climateResilience": {
        "score": <resilience score 1-100>,
        "vulnerabilities": [<climate vulnerabilities>],
        "adaptationStrategies": [<recommended adaptation strategies>]
      },
      "profitabilityAnalysis": {
        "potentialYield": "<estimated yield amount>",
        "marketValue": "<estimated market value>",
        "roi": "<return on investment estimate>",
        "improvements": [<ways to increase profitability>]
      },
      "seasonalGuidance": {
        "currentSeason": "<current growing season>",
        "upcomingTasks": [<seasonal tasks to consider>]
      }
    }
    
    Ensure all assessments are based on visible indicators in the farm image. If something cannot be determined from the image alone, provide a reasonable estimate based on the provided farm details.`;

    const result = await geminiModel.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(",")[1] // Remove the data:image/jpeg;base64, part
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
      text.match(/```\n([\s\S]*?)\n```/) ||
      text.match(/{[\s\S]*}/);

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const analysis = JSON.parse(jsonStr);
        return analysis;
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response", e);
        throw new Error("Failed to parse analysis results");
      }
    } else {
      console.error("No JSON found in Gemini response");
      throw new Error("Invalid analysis format");
    }
  } catch (error) {
    console.error("Error analyzing farm image:", error);
    throw error;
  }
}

// Helper function to ensure valid percentage values
function ensureValidPercentage(value: any): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

// Helper function to ensure valid pH values
function ensureValidPH(value: any): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 7;
  return Math.max(0, Math.min(14, num));
}
