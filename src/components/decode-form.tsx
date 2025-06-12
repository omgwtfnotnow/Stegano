
"use client";

import React, { useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileSearch, MessageSquareText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DecodeFormProps {
  onDecode: (imageFile: File) => void;
  isLoading: boolean;
  decodedMessage?: string | null;
}

export function DecodeForm({ onDecode, isLoading, decodedMessage }: DecodeFormProps) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const currentObjectUrl = imagePreviewUrl;
    if (currentObjectUrl && currentObjectUrl.startsWith('blob:')) {
      return () => {
        URL.revokeObjectURL(currentObjectUrl);
      };
    }
  }, [imagePreviewUrl]);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImagePreviewUrl(null);
    setSelectedFile(null);
    
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "Please upload a valid image file (PNG preferred).", variant: "destructive" });
        return;
      }
       if (file.type !== 'image/png') {
        toast({ title: "Warning", description: "This tool is optimized for decoding LSB from PNG images. Results may vary with other formats.", variant: "default" });
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "Error", description: "File size should not exceed 10MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      const newObjectUrl = URL.createObjectURL(file);
      setImagePreviewUrl(newObjectUrl);
    }
  };
  
  const handleDecodeClick = () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please upload an image file to decode.", variant: "destructive" });
      return;
    }
    onDecode(selectedFile);
  };
  
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Decode Message from Image</CardTitle>
        <CardDescription>Upload an image (PNG files encoded with this tool) to reveal a hidden message.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="file-upload-decode">Upload Encoded Image (PNG recommended)</Label>
          <div className="flex items-center space-x-2">
            <Input id="file-upload-decode" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageFileChange} className="flex-grow"/>
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {imagePreviewUrl && (
          <div className="space-y-2">
            <Label>Selected Image Preview</Label>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
              <Image src={imagePreviewUrl} alt="Selected preview for decoding" width={400} height={300} className="max-w-full max-h-[300px] object-contain rounded" data-ai-hint="puzzle pattern" />
            </div>
          </div>
        )}

        <Button onClick={handleDecodeClick} disabled={isLoading || !selectedFile} className="w-full">
          <FileSearch className="mr-2 h-4 w-4" />
          Decode from Image
        </Button>

        {decodedMessage !== null && decodedMessage !== undefined && (
          <div className="pt-4">
            <Alert variant={decodedMessage ? "default" : "destructive"} className="bg-card">
              <MessageSquareText className="h-4 w-4" />
              <AlertTitle className="font-headline">Decoded Message</AlertTitle>
              <AlertDescription className="break-words whitespace-pre-wrap">
                {decodedMessage || "No message found or image not encoded/corrupted."}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter>
         <p className="text-xs text-muted-foreground">This tool attempts to extract messages hidden using LSB steganography, primarily from PNG files encoded by this tool.</p>
      </CardFooter>
    </Card>
  );
}
