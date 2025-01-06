import OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});


const STAFF_PROMPT = `You are an AI health assistant designed to provide general educational support to medical professionals. Your role is to:
- Offer evidence-based explanations of medical concepts, healthcare terminology, and standard clinical practices
- Provide overviews of general approaches to diagnosing and managing conditions without making specific recommendations or suggesting actions for individual cases
- Highlight common considerations for health monitoring and general treatment principles but avoid prescribing medications, suggesting dosages, or recommending specific diagnostic tests
- Present responses in a structured format for clarity, such as:
  * Medical Concepts and Guidelines
  * Considerations for Monitoring
  * Examples of Common Practices
- Do not provide interpretations, make critical judgments, or assist in clinical decision-making for specific patients
- Always include the following disclaimer: "This AI is for informational purposes only and not a substitute for professional medical advice."
- If asked for specific clinical guidance or patient-related advice, respond with: "This AI cannot provide case-specific recommendations. Please consult a licensed healthcare provider for individualized guidance."
- Answer to general inquiries with clear, concise, and educational information that supports professional knowledge without influencing clinical decisions`;

const PATIENT_PROMPT = `You are an AI medical assistant helping patients. Your role is to:
- Provide general health information and guidance in accessible language
- Help users understand medical terms and conditions
- Clearly indicate when professional medical attention is required
- Always include a disclaimer that you're not a replacement for professional medical advice
- Be extra careful and conservative with medical advice
- Never provide specific medication recommendations
- For each response, include a "requiresDoctor" boolean field indicating if the patient should seek medical attention`;

interface DocumentChunk {
  orgId: string;
  fileName: string;
  content: string;
  embedding: number[];
  storagePath: string;
}

interface OpenAIResponse {
  content: string;
  requiresDoctor: boolean;
}

// Function to calculate cosine similarity between two vectors
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (mag1 * mag2);
}

// Function to get embeddings from OpenAI
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Function to find similar documents
async function findSimilarDocuments(query: string, orgId: string, limit: number = 3): Promise<string[]> {
  const firestore = getFirestore();
  const chunksCollection = collection(firestore, 'documentChunks');
  const chunksQuery = query(chunksCollection, where('orgId', '==', orgId));
  const chunks = await getDocs(chunksQuery);
  
  if (chunks.empty) {
    return [];
  }

  const queryEmbedding = await getEmbedding(query);
  
  const similarities = chunks.docs.map(doc => ({
    content: doc.data().content,
    similarity: cosineSimilarity(queryEmbedding, doc.data().embedding)
  }));
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(doc => doc.content);
}

async function readPdfContent(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument(new Uint8Array(arrayBuffer));
  const pdf = await loadingTask.promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
}

// Function to process and add a document to Firebase
export async function addDocument(file: File, orgId: string): Promise<void> {
  const storage = getStorage();
  const firestore = getFirestore();
  
  // Upload file to Storage
  const storageRef = ref(storage, `documents/${orgId}/${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  // Read file content based on type
  let text: string;
  if (file.type === 'application/pdf') {
    text = await readPdfContent(file);
  } else {
    text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  });

  const chunks = await splitter.splitText(text);
  
  // Store chunks with embeddings in Firestore
  const chunksCollection = collection(firestore, 'documentChunks');
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);
    await addDoc(chunksCollection, {
      orgId,
      fileName: file.name,
      content: chunk,
      embedding,
      storagePath: `documents/${orgId}/${file.name}`,
      createdAt: new Date().toISOString()
    });
  }
}

// Function to remove a document and its chunks
export async function removeDocument(fileName: string, orgId: string): Promise<void> {
  const storage = getStorage();
  const firestore = getFirestore();
  
  // Delete file from Storage
  const storageRef = ref(storage, `documents/${orgId}/${fileName}`);
  await deleteObject(storageRef);

  // Delete chunks from Firestore
  const chunksCollection = collection(firestore, 'documentChunks');
  const chunksQuery = query(
    chunksCollection, 
    where('orgId', '==', orgId),
    where('fileName', '==', fileName)
  );
  
  const chunks = await getDocs(chunksQuery);
  const deletePromises = chunks.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

// Function to list all documents for an organization
export async function listDocuments(orgId: string): Promise<string[]> {
  const firestore = getFirestore();
  const chunksCollection = collection(firestore, 'documentChunks');
  const docsQuery = query(chunksCollection, where('orgId', '==', orgId));
  const chunks = await getDocs(docsQuery);
  
  // Get unique file names
  const fileNames = new Set<string>();
  chunks.docs.forEach(doc => {
    fileNames.add(doc.data().fileName);
  });
  
  return Array.from(fileNames);
}

// Format staff response
function formatStaffResponse(content: string): string {
  if (content.includes('##') || content.includes('*')) {
    return content;
  }

  const sections = [
    'Recommended Tests/Diagnostics',
    'Key Values to Monitor',
    'Potential Medications/Treatments',
    'Contraindications/Warnings'
  ];

  let formattedContent = content;
  sections.forEach(section => {
    if (!content.toLowerCase().includes(section.toLowerCase())) {
      formattedContent += `\n\n## ${section}\nNo specific ${section.toLowerCase()} indicated for this case.`;
    }
  });

  return formattedContent;
}

// Main function to generate responses
export async function generateResponse(
  message: string, 
  isStaff: boolean, 
  orgId: string
): Promise<OpenAIResponse> {
  try {
    // Retrieve relevant context from document store
    const relevantDocs = await findSimilarDocuments(message, orgId);
    const context = relevantDocs.length > 0 
      ? `\n\nRelevant context from documentation:\n${relevantDocs.join('\n\n')}`
      : '';
    
    // Enhance the existing prompts with context
    const contextualPrompt = `${isStaff ? STAFF_PROMPT : PATIENT_PROMPT}${context}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: contextualPrompt 
        },
        { 
          role: "user", 
          content: message 
        }
      ],
      functions: [
        {
          name: "formatMedicalResponse",
          parameters: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The medical response content"
              },
              requiresDoctor: {
                type: "boolean",
                description: "Indicates if immediate medical attention is needed"
              }
            },
            required: ["content", "requiresDoctor"]
          }
        }
      ],
      function_call: { name: "formatMedicalResponse" },
      temperature: isStaff ? 0.5 : 0.7,
      max_tokens: 800
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (functionCall?.name === "formatMedicalResponse") {
      const { content, requiresDoctor } = JSON.parse(functionCall.arguments || "{}");
      
      if (isStaff) {
        return {
          content: formatStaffResponse(content),
          requiresDoctor
        };
      }
      
      return { content, requiresDoctor };
    }

    return {
      content: "I apologize, but I couldn't generate a response. Please try again.",
      requiresDoctor: false
    };
  } catch (error) {
    console.error('Error generating response:', error);
    return {
      content: "I apologize, but I'm having trouble connecting to my knowledge base. Please try again later.",
      requiresDoctor: false
    };
  }
}