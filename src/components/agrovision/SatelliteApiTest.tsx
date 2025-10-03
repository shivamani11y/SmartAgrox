import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Satellite, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiTestResult {
  step: string;
  status: 'success' | 'error' | 'testing';
  message: string;
  details?: any;
}

const SatelliteApiTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<ApiTestResult[]>([]);

  const runApiTest = async () => {
    setTesting(true);
    setResults([]);
    
    const testResults: ApiTestResult[] = [];
    
    try {
      // Test 1: Check API Keys
      testResults.push({ step: 'API Keys', status: 'testing', message: 'Checking API configuration...' });
      setResults([...testResults]);
      
      const hasApiKey = !!import.meta.env.VITE_SENTINEL_HUB_API_KEY;
      const hasInstanceId = !!import.meta.env.VITE_SENTINEL_HUB_INSTANCE_ID;
      
      if (hasApiKey && hasInstanceId) {
        testResults[0] = { step: 'API Keys', status: 'success', message: 'API keys configured' };
      } else {
        testResults[0] = { 
          step: 'API Keys', 
          status: 'error', 
          message: 'Missing API keys',
          details: { hasApiKey, hasInstanceId }
        };
      }
      setResults([...testResults]);
      
      // Test 2: Test Enhanced Satellite Service
      testResults.push({ step: 'Enhanced Service', status: 'testing', message: 'Testing enhanced satellite service...' });
      setResults([...testResults]);
      
      try {
        const { testSentinelHubConnection } = await import('@/services/enhancedSatelliteService');
        const connectionTest = await testSentinelHubConnection();
        
        if (connectionTest) {
          testResults[1] = { step: 'Enhanced Service', status: 'success', message: 'Connection successful' };
          toast.success('Satellite API connection verified!');
        } else {
          testResults[1] = { step: 'Enhanced Service', status: 'error', message: 'Connection failed' };
        }
      } catch (error) {
        testResults[1] = { 
          step: 'Enhanced Service', 
          status: 'error', 
          message: 'Service error: ' + error.message,
          details: error
        };
      }
      setResults([...testResults]);
      
      // Test 3: Test NDVI Fetch
      testResults.push({ step: 'NDVI Fetch', status: 'testing', message: 'Testing NDVI data fetch...' });
      setResults([...testResults]);
      
      try {
        const { fetchEnhancedNdviData } = await import('@/services/enhancedSatelliteService');
        
        // Test with sample coordinates (Hyderabad area)
        const testPolygon: [number, number][] = [
          [17.375, 78.470],
          [17.378, 78.475],
          [17.372, 78.478],
          [17.369, 78.473]
        ];
        
        const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const toDate = new Date().toISOString().split('T')[0];
        
        // Replace the fetchNdviData call with:
        const ndviData = await fetchEnhancedNdviData(testPolygon, fromDate, toDate);
        
        if (ndviData && ndviData.length > 0) {
          testResults[2] = { 
            step: 'NDVI Fetch', 
            status: 'success', 
            message: `NDVI data received: ${ndviData[0].value.toFixed(3)}`,
            details: ndviData
          };
          toast.success(`Real NDVI value: ${ndviData[0].value.toFixed(3)}`);
        } else {
          testResults[2] = { step: 'NDVI Fetch', status: 'error', message: 'No NDVI data returned' };
        }
      } catch (error) {
        testResults[2] = { 
          step: 'NDVI Fetch', 
          status: 'error', 
          message: 'NDVI fetch failed: ' + error.message,
          details: error
        };
      }
      setResults([...testResults]);
      
    } catch (error) {
      console.error('API test failed:', error);
      toast.error('API test failed: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'testing': return <AlertCircle className="h-4 w-4 text-yellow-500 animate-spin" />;
      default: return null;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Satellite className="h-5 w-5" />
          <span>Satellite API Diagnostics</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runApiTest} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Running Tests...' : 'Test Satellite API Connection'}
        </Button>
        
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(result.status)}
                  <span className="font-medium">{result.step}</span>
                </div>
                <div className="text-right">
                  <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                    {result.message}
                  </Badge>
                  {result.details && (
                    <details className="text-xs text-gray-500 mt-1">
                      <summary>Details</summary>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SatelliteApiTest;
