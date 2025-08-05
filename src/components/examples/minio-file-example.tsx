'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { toast } from '@/hooks/use-toast';
import { Eye, Download, Trash2 } from 'lucide-react';

export function MinioFileExample() {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = (objectKeys: string | string[]) => {
    const keys = Array.isArray(objectKeys) ? objectKeys : [objectKeys];
    setUploadedFiles(prev => [...prev, ...keys]);
  };

  const handlePreview = (objectKey: string) => {
    // Open preview in new tab
    window.open(`/api/files/preview/${encodeURIComponent(objectKey)}`, '_blank');
  };

  const handleDownload = (objectKey: string) => {
    // Trigger download
    window.open(`/api/files/download/${encodeURIComponent(objectKey)}`, '_blank');
  };

  const handleDelete = async (objectKey: string) => {
    try {
      // Note: You would need to implement a delete API endpoint
      // For now, just remove from the UI
      setUploadedFiles(prev => prev.filter(key => key !== objectKey));
      toast({
        title: 'Mafanikio',
        description: 'Faili limeondolewa',
      });
    } catch (error) {
      toast({
        title: 'Kosa',
        description: 'Imeshindwa kuondoa faili',
        variant: 'destructive'
      });
    }
  };

  const getFileName = (objectKey: string) => {
    const parts = objectKey.split('/');
    return parts[parts.length - 1] || objectKey;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MinIO File Management Demo</CardTitle>
          <CardDescription>
            Jaribu kupakia, kuangalia, na kupakua faili la PDF kwa kutumia MinIO (Ukubwa wa juu: 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload Component */}
          <FileUpload
            label="Chagua Faili la PDF"
            description="Pakia faili la PDF kwenye MinIO storage (Ukubwa wa juu: 2MB)"
            accept=".pdf"
            maxSize={2}
            multiple={true}
            folder="test-uploads"
            value={uploadedFiles}
            onChange={handleFileUpload}
          />

          {/* Manual File Upload Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Au Chagua Faili la PDF Kwa Mkono</h3>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;

                setUploading(true);
                try {
                  for (const file of Array.from(files)) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('folder', 'manual-uploads');

                    const response = await fetch('/api/files/upload', {
                      method: 'POST',
                      body: formData,
                    });

                    if (response.ok) {
                      const result = await response.json();
                      if (result.success) {
                        setUploadedFiles(prev => [...prev, result.data.objectKey]);
                      }
                    }
                  }
                  
                  toast({
                    title: 'Mafanikio',
                    description: 'Faili zimepakuliwa',
                  });
                } catch (error) {
                  toast({
                    title: 'Kosa',
                    description: 'Imeshindwa kupakia faili',
                    variant: 'destructive'
                  });
                } finally {
                  setUploading(false);
                  e.target.value = '';
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={uploading}
            />
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Faili Zilizopakuliwa</h3>
              <div className="space-y-2">
                {uploadedFiles.map((objectKey, index) => (
                  <div
                    key={`${objectKey}-${index}`}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getFileName(objectKey)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {objectKey}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(objectKey)}
                        className="h-8 w-8 p-0"
                        title="Angalia"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(objectKey)}
                        className="h-8 w-8 p-0"
                        title="Pakua"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(objectKey)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Ondoa"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testing Buttons */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Jaribu Vipengele</h3>
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  if (uploadedFiles.length > 0) {
                    handlePreview(uploadedFiles[0]);
                  } else {
                    toast({
                      title: 'Hakuna Faili',
                      description: 'Pakia faili kwanza',
                      variant: 'destructive'
                    });
                  }
                }}
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                Angalia Faili la Kwanza
              </Button>
              
              <Button
                onClick={() => {
                  if (uploadedFiles.length > 0) {
                    handleDownload(uploadedFiles[0]);
                  } else {
                    toast({
                      title: 'Hakuna Faili',
                      description: 'Pakia faili kwanza',
                      variant: 'destructive'
                    });
                  }
                }}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Pakua Faili la Kwanza
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}