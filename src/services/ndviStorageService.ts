import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';

// NDVI Analysis Data Types
export interface NDVIAnalysis {
  id?: string;
  userId: string;
  farmId: string;
  farmName: string;
  analysisDate: Date;
  ndviValue: number;
  area: number; // in hectares
  coordinates: {
    lat: number;
    lng: number;
  };
  polygon?: Array<{ lat: number; lng: number }>; // drawn area coordinates
  confidence: number;
  vegetationHealth: 'poor' | 'fair' | 'good' | 'excellent';
  recommendations?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Store NDVI analysis data
export const saveNDVIAnalysis = async (ndviData: Omit<NDVIAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'ndvi-analysis'), {
      ...ndviData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('NDVI analysis saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving NDVI analysis:', error);
    throw error;
  }
};

// Get NDVI analysis for a specific farm
export const getFarmNDVIAnalysis = async (userId: string, farmId: string): Promise<NDVIAnalysis[]> => {
  try {
    const q = query(
      collection(db, 'ndvi-analysis'),
      where('userId', '==', userId),
      where('farmId', '==', farmId),
      orderBy('analysisDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const ndviAnalyses: NDVIAnalysis[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      ndviAnalyses.push({
        id: doc.id,
        ...data,
        analysisDate: data.analysisDate.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as NDVIAnalysis);
    });
    
    return ndviAnalyses;
  } catch (error) {
    console.error('Error getting farm NDVI analysis:', error);
    throw error;
  }
};

// Get latest NDVI analysis for a farm
export const getLatestNDVIAnalysis = async (userId: string, farmId: string): Promise<NDVIAnalysis | null> => {
  try {
    const analyses = await getFarmNDVIAnalysis(userId, farmId);
    return analyses.length > 0 ? analyses[0] : null;
  } catch (error) {
    console.error('Error getting latest NDVI analysis:', error);
    return null;
  }
};
