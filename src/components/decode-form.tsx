"use client";

import React, { useState, useCallback, ChangeEvent } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileSearch, Loader2, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DecodeFormProps {
  onDecode: (imageIdentifier: string, imageFile?: File, imageUrl?: string) => void;
  isLoading: boolean;
  decodedMessage?: string | null;
}

export function DecodeForm({ onDecode, isLoading, decodedMessage }: DecodeFormProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const { toast } = useToast();

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
       if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Error", description: "Image size should not exceed 5MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setImageUrlInput(''); 
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setImageUrlInput(url);
    if (url) {
      setImageSrc(url);
      setSelectedFile(null);
    } else if (!selectedFile) {
      setImageSrc(null);
    }
  };

  const handleDecode = () => {
    if (!imageSrc) {
      toast({ title: "Error", description: "Please upload an image or provide an image URL to decode.", variant: "destructive" });
      return;
    }
    const identifier = selectedFile ? selectedFile.name : imageUrlInput;
    onDecode(identifier, selectedFile || undefined, imageUrlInput || undefined);
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Decode Message</CardTitle>
        <CardDescription>Upload an image that potentially contains a hidden message.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="image-upload-decode">Upload Image for Decoding</Label>
          <div className="flex items-center space-x-2">
            <Input id="image-upload-decode" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageFileChange} className="flex-grow"/>
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center py-1">OR</p>
          <Label htmlFor="image-url-decode">Enter Image URL for Decoding</Label>
          <div className="flex items-center space-x-2">
            <Input id="image-url-decode" type="url" placeholder="https://example.com/encoded_image.png" value={imageUrlInput} onChange={handleImageUrlChange} className="flex-grow" />
            <LinkIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {imageSrc && (
          <div className="space-y-2">
            <Label>Image Preview</Label>
            <div className="rounded-md border border-muted-foreground/20 p-2 flex justify-center items-center bg-muted/20 aspect-video overflow-hidden">
              <Image src={imageSrc} alt="Selected preview for decoding" width={400} height={300} className="max-w-full max-h-[300px] object-contain rounded" data-ai-hint="pattern background"/>
            </div>
          </div>
        )}

        <Button onClick={handleDecode} disabled={isLoading || !imageSrc} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Decode Image
        </Button>

        {decodedMessage !== null && decodedMessage !== undefined && (
          <div className="pt-4 border-t">
            <Alert variant={decodedMessage ? "default" : "destructive"} className="bg-card">
              <FileSearch className="h-4 w-4" />
              <AlertTitle className="font-headline">Decoded Message</AlertTitle>
              <AlertDescription className="break-words whitespace-pre-wrap">
                {decodedMessage || "No message found in this image (for this session), or the image was not encoded using this tool during this session."}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter>
         <p className="text-xs text-muted-foreground">Note: Decoding is conceptual. It attempts to retrieve messages "hidden" during this session only.</p>
      </CardFooter>
    </Card>
  );
}
